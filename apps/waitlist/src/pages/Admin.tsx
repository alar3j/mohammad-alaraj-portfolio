import { L } from "@/components/ui";
import { adminCall, type SignupRow } from "@/lib/waitlist";
import { Download, KeyRound, Loader2, LogOut, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const KEY_STORE = "techalaraj_admin_key";

type ListResponse = { ok: boolean; total: number; today: number; rows: SignupRow[]; error?: string };

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORE) ?? "";
  } catch {
    return "";
  }
}

function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: SignupRow[]) {
  const cols: (keyof SignupRow)[] = ["id", "name", "email", "source", "timezone", "country", "user_agent", "created_at"];
  const body = [cols.join(","), ...rows.map(r => cols.map(c => csvCell(r[c])).join(","))].join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `techalaraj-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fmt = new Intl.DateTimeFormat("ar-JO-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default function Admin() {
  const [key, setKey] = useState(readKey);
  const [input, setInput] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminCall<ListResponse>({ action: "admin_list", key: k });
      if (res.status === 403 || !res.data.ok) {
        setError("المفتاح غلط (أو محاولات كثيرة، استنى 15 دقيقة).");
        setKey("");
        try {
          sessionStorage.removeItem(KEY_STORE);
        } catch {
          /* ignore */
        }
        return;
      }
      setData(res.data);
      setKey(k);
      try {
        sessionStorage.setItem(KEY_STORE, k);
      } catch {
        /* ignore */
      }
    } catch {
      setError("ما قدرنا نوصل للسيرفر. جرّب مرة ثانية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key) void load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (row: SignupRow) => {
    if (!confirm(`حذف ${row.email}؟`)) return;
    const res = await adminCall<{ ok: boolean }>({ action: "admin_delete", key, id: row.id });
    if (res.data.ok) void load(key);
    else setError("ما انحذف. جرّب مرة ثانية.");
  };

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const s = q.trim().toLowerCase();
    return s ? all.filter(r => `${r.name} ${r.email} ${r.source ?? ""} ${r.timezone ?? ""}`.toLowerCase().includes(s)) : all;
  }, [data, q]);

  const bySource = useMemo(() => tally(data?.rows ?? [], r => r.source || "مباشر"), [data]);
  const byZone = useMemo(() => tally(data?.rows ?? [], r => r.timezone?.split("/").pop()?.replace(/_/g, " ") || "غير معروف"), [data]);

  if (!key || !data) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (input.trim()) void load(input.trim());
    };
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <form onSubmit={submit} className="glass w-full max-w-[420px] p-6">
          <h1 className="mb-1 flex items-center gap-2 text-[20px] font-bold">
            <KeyRound className="h-5 w-5 text-yellow" aria-hidden="true" />
            لوحة قائمة الانتظار
          </h1>
          <p className="mb-4 text-[14px] text-fg-2">ادخل مفتاح الإدارة. المفتاح بينحفظ بهالتبويب بس.</p>
          <label htmlFor="admin-key" className="sr-only">
            مفتاح الإدارة
          </label>
          <input
            id="admin-key"
            type="password"
            className="field"
            dir="ltr"
            autoComplete="current-password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="ta_…"
          />
          <button type="submit" className="btn-cta mt-3 w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "دخول"}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-error">
              {error}
            </p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="wrap py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold">قائمة الانتظار</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => load(key)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> تحديث
          </button>
          <button className="btn-ghost" onClick={() => downloadCsv(data.rows)}>
            <Download className="h-4 w-4" aria-hidden="true" /> تصدير <L>CSV</L>
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              try {
                sessionStorage.removeItem(KEY_STORE);
              } catch {
                /* ignore */
              }
              setKey("");
              setData(null);
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> خروج
          </button>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="إجمالي المسجّلين" value={data.total} />
        <Stat label="آخر 24 ساعة" value={data.today} />
        <Breakdown title="حسب المصدر" items={bySource} />
        <Breakdown title="حسب المدينة / المنطقة الزمنية" items={byZone} />
      </section>

      {error && (
        <p role="alert" className="mb-3 text-[13px] text-error">
          {error}
        </p>
      )}

      <div className="relative mb-3 max-w-[360px]">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden="true" />
        <input className="field !h-11 !ps-9 !text-[14px]" placeholder="ابحث بالاسم أو الإيميل…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead className="text-start text-[12.5px] text-fg-3">
            <tr className="border-b border-white/[0.06]">
              {["#", "الاسم", "الإيميل", "المصدر", "المنطقة", "التاريخ", ""].map(h => (
                <th key={h} className="px-4 py-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                <td className="ltr px-4 py-3 text-fg-3">{r.id}</td>
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="ltr px-4 py-3 text-start" dir="ltr">
                  {r.email}
                </td>
                <td className="px-4 py-3 text-fg-2">{r.source ?? "—"}</td>
                <td className="ltr px-4 py-3 text-fg-2">{r.timezone ?? "—"}</td>
                <td className="px-4 py-3 text-fg-2">{fmt.format(new Date(r.created_at))}</td>
                <td className="px-4 py-3">
                  <button className="rounded-md p-1.5 text-fg-3 hover:bg-error/10 hover:text-error" onClick={() => remove(r)} aria-label={`حذف ${r.email}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-fg-3">
                  لسا ما في تسجيلات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function tally<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>();
  rows.forEach(r => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] text-fg-2">{label}</p>
      <p className="ltr mt-1 text-[34px] font-bold">{value.toLocaleString("en")}</p>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: [string, number][] }) {
  const max = Math.max(1, ...items.map(i => i[1]));
  return (
    <div className="card p-5">
      <p className="mb-2 text-[13px] text-fg-2">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.length === 0 && <li className="text-[13px] text-fg-3">—</li>}
        {items.map(([k, n]) => (
          <li key={k} className="flex items-center gap-2 text-[13px]">
            <span className="w-24 truncate">{k}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full bg-yellow" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="ltr w-8 text-end text-fg-2">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
