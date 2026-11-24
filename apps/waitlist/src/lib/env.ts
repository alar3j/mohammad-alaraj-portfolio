import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    cb => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** Phones, small GPUs, data-saver: lighter 3D (no bloom, fewer particles). */
export function isLowPower(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    !!nav.connection?.saveData
  );
}

export function saveData(): boolean {
  return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
}

/** true once the element has come within `margin` of the viewport (sticky). */
export function useNearViewport<T extends Element>(margin = "300px") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(e => e.some(x => x.isIntersecting) && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin, near]);
  return [ref, near] as const;
}

/** Live visibility (used to pause WebGL render loops off-screen). */
export function useInViewport<T extends Element>(margin = "0px") {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(e => setVisible(e[e.length - 1].isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, visible] as const;
}

/** Runs `fn` when the browser is idle (or after `timeout`). */
export function whenIdle(fn: () => void, timeout = 1500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}
