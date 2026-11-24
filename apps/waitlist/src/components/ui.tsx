import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function VerifiedBadge({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="موثّق" role="img">
      <path
        fill="#3B82F6"
        d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"
      />
      <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.2l3 3 6-6.2" />
    </svg>
  );
}

/** Latin fragment isolated inside Arabic text. */
export function L({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="ltr">
      {children}
    </bdi>
  );
}

/** Yellow highlight box for [[...]] copy. */
export function Hl({ children }: { children: ReactNode }) {
  return <mark className="hl-box">{children}</mark>;
}

type RevealTag = "div" | "section" | "li" | "article" | "figure";

/** Fade-up once when scrolled into view (no-op with reduced motion via CSS). */
export function Reveal({
  children,
  className = "",
  as: Tag = "div",
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return void el.classList.add("is-visible");
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      style={{ ...style, ...(delay ? { transitionDelay: `${delay}ms` } : null) }}
    >
      {children}
    </Tag>
  );
}

export function SectionHead({
  kicker,
  children,
  intro,
  id,
}: {
  kicker: string;
  children: ReactNode;
  intro?: ReactNode;
  id?: string;
}) {
  return (
    <Reveal className="mx-auto mb-10 max-w-[780px] text-center md:mb-14">
      <p className="kicker mb-4">{kicker}</p>
      <h2 id={id} className="t-h2 text-fg">
        {children}
      </h2>
      {intro && <p className="t-lead mx-auto mt-4 max-w-[640px]">{intro}</p>}
    </Reveal>
  );
}

/** Card that tilts in 3D towards the pointer, with a soft spotlight. */
export function TiltCard({
  children,
  className = "",
  as: Tag = "div",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
  max?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    };
    const leave = () => {
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);
  return (
    <Tag ref={ref as never} className={`tilt ${className}`}>
      <span className="spot" aria-hidden="true" />
      {children}
    </Tag>
  );
}

/** Counts up to the number in `value` (keeps prefix/suffix like "280K+"). */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [text, setText] = useState(value);
  useEffect(() => {
    const el = ref.current;
    const m = value.match(/^(\D*)([\d.]+)(.*)$/);
    if (!el || !m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num);
    const decimals = num.includes(".") ? num.split(".")[1].length : 0;
    let raf = 0;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        const eased = 1 - Math.pow(1 - p, 4);
        setText(`${pre}${(target * eased).toFixed(decimals)}${post}`);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setText(`${pre}${(0).toFixed(decimals)}${post}`);
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
