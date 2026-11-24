import { L, Reveal } from "@/components/ui";
import { scrollToHeroForm } from "@/components/WaitlistForm";
import { BASE } from "@/config";
import { loadFinder, type Ranked, type ToolFinder as Finder } from "@/ai/finder";
import { hasWebGL, isLowPower, saveData, useInViewport, useNearViewport, useReducedMotion } from "@/lib/env";
import { ArrowUpLeft, Check, Copy, Cpu, Lightbulb, Search, Sparkles, Wand2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

const GalaxyScene = lazy(() => import("@/three/GalaxyScene"));

const SUGGESTIONS = [
  "بدي أعمل ريلز من فيديو بودكاست طويل",
  "صمملي بوست لمشروعي",
  "لخصلي محاضرة PDF للامتحان",
  "بدي موقع لمشروعي بدون برمجة",
  "تعليق صوتي عربي لفيديو",
  "حرّك صورة قديمة",
  "أأتمت مهمة بتتكرر كل يوم",
];

export function ToolFinder() {
  const [nearRef, near] = useNearViewport<HTMLElement>("500px");
  const [visRef, visible] = useInViewport<HTMLDivElement>("100px");
  const reduced = useReducedMotion();
  const [finder, setFinder] = useState<Finder | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [results, setResults] = useState<Ranked[]>([]);
  const [thinking, setThinking] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [lowPower, setLowPower] = useState(true);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef<string | null>(null);

  const start = () => {
    if (finder || failed) return;
    loadFinder(BASE, setProgress)
      .then(f => {
        setFinder(f);
        if (pending.current) run(pending.current, f);
      })
      .catch(() => setFailed(true));
  };

  // Load the model when the section approaches (skip on data-saver until used).
  useEffect(() => {
    if (near && !saveData()) start();
    if (near && hasWebGL()) {
      setLowPower(isLowPower());
      setShow3D(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  function run(text: string, f: Finder | null = finder) {
    const q = text.trim();
    if (!q) return;
    if (!f) {
      pending.current = q;
      setAsked(q);
      start();
      return;
    }
    pending.current = null;
    setThinking(true);
    setAsked(q);
    const t0 = performance.now();
    const ranked = f.rank(q, 3);
    const ms = performance.now() - t0;
    // a short "thinking" beat so the 3D core visibly reacts
    window.setTimeout(() => {
      setResults(ranked);
      setSelected(null);
      setThinking(false);
      setLastMs(ms);
    }, reduced ? 0 : 420);
  }

  // live results while typing (debounced)
  useEffect(() => {
    if (!finder || query.trim().length < 4) return;
    const id = window.setTimeout(() => run(query), 550);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, finder]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    run(query);
  };

  const selectedTool = useMemo(() => finder?.tools.find(t => t.id === selected) ?? null, [finder, selected]);
  const shown: Ranked[] = selectedTool
    ? [{ tool: selectedTool, score: 0, match: 0 }, ...results.filter(r => r.tool.id !== selectedTool.id).slice(0, 2)]
    : results;
  const cats = useMemo(() => new Map(finder?.categories.map(c => [c.id, c]) ?? []), [finder]);
  const loading = !finder && !failed;

  return (
    <section
      ref={nearRef}
      id="finder"
      className="section overflow-hidden border-y border-white/[0.05] bg-ink-2"
      aria-labelledby="finder-title"
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="wrap relative">
        <Reveal className="mx-auto mb-10 max-w-[800px] text-center md:mb-12">
          <p className="kicker mb-4">جرّب الذكاء الاصطناعي هلأ</p>
          <h2 id="finder-title" className="t-h2 text-fg">
            شو بدك تعمل اليوم؟{" "}
            <span className="hl-line">
              <mark className="hl-box">اكتبها بكلامك، والأداة بتلاقيك.</mark>
            </span>
          </h2>
          <p className="t-lead mx-auto mt-4 max-w-[660px]">
            نموذج ذكاء اصطناعي من <L>Hugging Face</L> بيشتغل داخل متصفحك، بدون سيرفر وبدون ما تطلع بياناتك من جهازك،
            وبيختارلك من الـ<L>30</L> أداة اللي بالدليل.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
          {/* 3D galaxy */}
          <Reveal className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-6">
            <div ref={visRef} className="glass relative h-[300px] overflow-hidden !rounded-[28px] sm:h-[380px] lg:h-[540px]">
              {show3D && finder ? (
                <Suspense fallback={<GalaxyPlaceholder />}>
                  <div className="absolute inset-0" aria-hidden="true">
                    <GalaxyScene
                      tools={finder.tools}
                      categories={finder.categories}
                      ranked={results.map(r => r.tool.id)}
                      thinking={thinking}
                      active={visible}
                      reduced={reduced}
                      lowPower={lowPower}
                      onSelect={id => setSelected(id)}
                    />
                  </div>
                </Suspense>
              ) : (
                <GalaxyPlaceholder progress={loading ? progress : undefined} />
              )}
              <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
                <span className="pill !bg-ink/70 text-[11.5px] text-fg-2 backdrop-blur">
                  <Cpu className="h-3.5 w-3.5 text-sky" aria-hidden="true" />
                  يشتغل على جهازك · <L>static-similarity-mrl-multilingual</L>
                </span>
                {lastMs != null && (
                  <span className="pill !bg-ink/70 text-[11.5px] text-fg-2 backdrop-blur">
                    <L>{lastMs < 1 ? "<1" : Math.round(lastMs)} ms</L>
                  </span>
                )}
              </div>
            </div>
          </Reveal>

          {/* input + results */}
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
            <Reveal>
              <form onSubmit={onSubmit} className="glass p-3 md:p-4" role="search" aria-label="ابحث عن أداة ذكاء اصطناعي">
                <label htmlFor="finder-input" className="sr-only">
                  اكتب شو بدك تعمل
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-3" aria-hidden="true" />
                    <input
                      ref={inputRef}
                      id="finder-input"
                      className="field !ps-12"
                      placeholder="مثلاً: بدي أعمل فيديو لمنتجي…"
                      value={query}
                      maxLength={200}
                      autoComplete="off"
                      enterKeyHint="search"
                      onFocus={start}
                      onChange={e => setQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-cta !min-h-[54px] !px-4 md:!px-6" aria-label="اقترحلي أداة">
                    <Wand2 className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">اقترحلي</span>
                  </button>
                </div>

                {loading && progress > 0 && progress < 1 && (
                  <div className="mt-3 flex items-center gap-3 text-[12px] text-fg-3" aria-live="polite">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="progress-bar h-full" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                    <span>بنحمّل النموذج · {Math.round(progress * 100)}%</span>
                  </div>
                )}
                {failed && (
                  <p className="mt-3 text-[13px] text-error" role="alert">
                    ما قدرنا نحمّل النموذج. تأكد من الإنترنت وجرّب مرة ثانية.
                  </p>
                )}

                <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-fg-2 transition hover:border-yellow/40 hover:text-fg"
                      onClick={() => {
                        setQuery(s);
                        run(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </form>
            </Reveal>

            <div aria-live="polite" aria-busy={thinking} className="flex flex-col gap-3">
              {thinking && <ResultSkeleton />}
              {!thinking && asked && !finder && !failed && <ResultSkeleton />}
              {!thinking &&
                shown.map((r, i) => (
                  <ResultCard
                    key={`${asked}-${r.tool.id}`}
                    r={r}
                    rank={i}
                    picked={!!selectedTool && i === 0}
                    catName={cats.get(r.tool.cat)?.name ?? ""}
                    catColor={cats.get(r.tool.cat)?.color ?? "#ffd400"}
                  />
                ))}
              {!thinking && results.length > 0 && (
                <div className="pop-in flex flex-col items-start gap-3 rounded-2xl border border-yellow/25 bg-yellow/[0.06] p-4 sm:flex-row sm:items-center">
                  <p className="flex-1 text-[14px] leading-relaxed text-fg">
                    هدول <L>3</L> من <L>30</L> أداة بالدليل المجاني، مع برومبتات جاهزة وخطة أول <L>7</L> أيام.
                  </p>
                  <button type="button" className="btn-cta w-full !min-h-[46px] !text-[15px] sm:w-auto" onClick={scrollToHeroForm}>
                    سجّل وحمّل الدليل
                  </button>
                </div>
              )}
              {!asked && (
                <p className="flex items-center gap-2 px-1 text-[13px] text-fg-3">
                  <Sparkles className="h-4 w-4 text-yellow" aria-hidden="true" />
                  اكتب بلهجتك العادية، أو اختار وحدة من الاقتراحات.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GalaxyPlaceholder({ progress }: { progress?: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(closest-side,rgba(37,99,235,.28),transparent)]" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 animate-spin rounded-full border-2 border-sky/20 border-t-yellow [animation-duration:1.6s] motion-reduce:animate-none" />
        {progress != null && <span className="ltr text-[12px] text-fg-3">{Math.round(progress * 100)}%</span>}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="card flex flex-col gap-3 p-5" aria-label="جاري البحث">
      <div className="shimmer h-5 w-1/3 rounded" />
      <div className="shimmer h-3 w-full rounded" />
      <div className="shimmer h-3 w-4/5 rounded" />
    </div>
  );
}

function ResultCard({
  r,
  rank,
  picked,
  catName,
  catColor,
}: {
  r: Ranked;
  rank: number;
  picked: boolean;
  catName: string;
  catColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const t = r.tool;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.tip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const best = rank === 0;
  return (
    <article
      className={`card pop-in p-4 md:p-5 ${best ? "!border-yellow/40 shadow-[0_20px_60px_-30px_rgba(255,212,0,.6)]" : ""}`}
      style={{ animationDelay: `${rank * 90}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-[12px] font-bold ${best ? "bg-yellow text-ink" : "bg-white/10 text-fg"}`}
        >
          <L>{picked ? "★" : `#${rank + 1}`}</L>
        </span>
        <h3 className="text-[19px] font-bold text-fg">
          <L>{t.name}</L>
        </h3>
        <span className="rounded-full border px-2 py-0.5 text-[11.5px] font-semibold" style={{ color: catColor, borderColor: `${catColor}55` }}>
          {catName}
        </span>
        {!picked && r.match > 0 && (
          <span className="ms-auto flex items-center gap-2 text-[12px] text-fg-3" title="درجة التطابق">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <span className="progress-bar block h-full" style={{ width: `${r.match}%` }} />
            </span>
            <L>{r.match}%</L>
          </span>
        )}
      </div>
      <p className="mt-3 text-[14.5px] leading-[1.85] text-fg">
        <strong className="text-yellow">شو هي: </strong>
        {t.what}
      </p>
      <p className="mt-1 text-[14.5px] leading-[1.85] text-fg-2">
        <strong className="text-yellow">استخدمها لـ: </strong>
        {t.use}
      </p>
      <div className="mt-3 rounded-xl border border-dashed border-yellow/25 bg-ink/60 p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-yellow">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
            {t.tipType === "prompt" ? "جرّب هالبرومبت" : "نصيحة"}
          </span>
          {t.tipType === "prompt" && (
            <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-fg-2 hover:bg-white/5 hover:text-fg">
              {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "تم النسخ" : "انسخ"}
            </button>
          )}
        </div>
        <p className="text-[14px] leading-[1.8] text-fg">{t.tip}</p>
      </div>
      <a
        href={t.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-sky hover:text-fg"
      >
        افتح <L>{t.name}</L>
        <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
      </a>
    </article>
  );
}
