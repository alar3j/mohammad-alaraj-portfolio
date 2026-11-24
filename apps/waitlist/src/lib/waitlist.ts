import { useSyncExternalStore } from "react";
import { WAITLIST_API } from "../config";

export type WaitlistStatus = "created" | "duplicate" | null;
export type JoinResult = "created" | "duplicate" | "invalid" | "rate_limited" | "error";

/* --------------------------------------------- remembered signup status -- */
const KEY = "techalaraj_waitlist_v1";
const listeners = new Set<() => void>();
let memoryStatus: WaitlistStatus = null;

function read(): WaitlistStatus {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "created" || raw === "duplicate") return raw;
  } catch {
    /* storage blocked (private mode / in-app browser) */
  }
  return memoryStatus;
}

export function setWaitlistStatus(status: Exclude<WaitlistStatus, null>) {
  memoryStatus = status;
  try {
    window.localStorage.setItem(KEY, status);
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWaitlistStatus() {
  return useSyncExternalStore(subscribe, read, () => null);
}

/* ------------------------------------------------------------ API client -- */
/** Traffic source from ?src= or ?utm_source= (e.g. instagram, dm, bio). */
export function getTrafficSource(): string | null {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("src") || p.get("utm_source") || null;
  } catch {
    return null;
  }
}

function timeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export async function joinWaitlist(input: { name: string; email: string; website: string }): Promise<JoinResult> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(WAITLIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        source: getTrafficSource(),
        tz: timeZone(),
        website: input.website,
      }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    const s = data.status;
    return s === "created" || s === "duplicate" || s === "invalid" || s === "rate_limited" ? s : "error";
  } catch {
    return "error";
  } finally {
    window.clearTimeout(timer);
  }
}

/* -------------------------------------------------------------- admin API -- */
export type SignupRow = {
  id: number;
  name: string;
  email: string;
  source: string | null;
  timezone: string | null;
  country: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function adminCall<T>(body: Record<string, unknown>): Promise<{ status: number; data: T }> {
  const res = await fetch(WAITLIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}
