// TechAlaraj AI waitlist API (Supabase Edge Function, Deno).
//
// POST JSON { action, ... }
//   join          { name, email, source?, tz?, website? }  -> { status: created|duplicate|invalid|rate_limited }
//   admin_list    { key }                             -> { ok, total, today, rows[] }
//   admin_delete  { key, id }                         -> { ok }
//
// All validation, de-duplication and rate limiting live in Postgres
// (schema `techalaraj`), this function only forwards requests to it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1, idle_timeout: 20 });

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (
    fwd.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 64);
}

function country(req: Request): string | null {
  const c = req.headers.get("cf-ipcountry") ?? req.headers.get("x-country-code") ?? req.headers.get("x-vercel-ip-country");
  return c && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return json({ error: "too_large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const ip = clientIp(req);

  try {
    switch (body.action) {
      case "join": {
        // Honeypot: real people never fill the hidden "website" field.
        if (str(body.website, 500).trim() !== "") return json({ status: "created" });
        const [row] = await sql`
          select techalaraj.join_waitlist(
            ${str(body.name, 200)}, ${str(body.email, 320)}, ${str(body.source, 200) || null},
            ${ip}, ${str(req.headers.get("user-agent"), 512) || null}, ${country(req)},
            ${str(body.tz, 64) || null}
          ) as r`;
        return json(row.r);
      }
      case "admin_list": {
        const [row] = await sql`select techalaraj.admin_signups(${str(body.key, 200)}, ${ip}) as r`;
        return json(row.r, row.r.ok ? 200 : 403);
      }
      case "admin_delete": {
        const id = Number(body.id);
        if (!Number.isSafeInteger(id) || id <= 0) return json({ ok: false, error: "bad_id" }, 400);
        const [row] = await sql`select techalaraj.admin_delete(${str(body.key, 200)}, ${ip}, ${id}) as r`;
        return json(row.r, row.r.ok ? 200 : 403);
      }
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("waitlist error", err instanceof Error ? err.message : err);
    return json({ status: "error" }, 500);
  }
});
