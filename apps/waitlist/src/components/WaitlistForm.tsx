import { GUIDE_FILE, GUIDE_URL, INSTAGRAM_URL } from "@/config";
import { joinWaitlist, setWaitlistStatus, useWaitlistStatus } from "@/lib/waitlist";
import { ArrowLeft, Download, Gift, Loader2, Share2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const MSG = {
  nameEmpty: "اكتب اسمك لو سمحت",
  emailEmpty: "اكتب بريدك الإلكتروني",
  emailInvalid: "تأكد إن البريد الإلكتروني مكتوب صح",
  server: "صار خطأ، جرّب مرة ثانية",
  rateLimited: "جرّبت كذا مرة ورا بعض. استنى كم دقيقة وجرّب مرة ثانية.",
};

const CTA_LABEL = "احجز مكانك بقائمة الانتظار";
const MICRO_COPY = "بدون رسائل مزعجة. بنستخدم اسمك وإيميلك فقط لنبلغك بالإطلاق، وبتقدر تلغي الاشتراك بأي وقت.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validateName = (v: string) => (v.trim() ? null : MSG.nameEmpty);
function validateEmail(v: string) {
  const e = v.trim();
  if (!e) return MSG.emailEmpty;
  if (!EMAIL_RE.test(e)) return MSG.emailInvalid;
  return null;
}

export function WaitlistForm({ id }: { id: "hero" | "final" }) {
  const status = useWaitlistStatus();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<{ name: string | null; email: string | null }>({ name: null, email: null });
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const next = { name: validateName(name), email: validateEmail(email) };
    setErrors(next);
    setServerError(null);
    if (next.name) return nameRef.current?.focus();
    if (next.email) return emailRef.current?.focus();

    setLoading(true);
    const result = await joinWaitlist({ name, email, website });
    setLoading(false);
    if (result === "created" || result === "duplicate") setWaitlistStatus(result);
    else if (result === "invalid") {
      setErrors({ name: null, email: MSG.emailInvalid });
      emailRef.current?.focus();
    } else setServerError(result === "rate_limited" ? MSG.rateLimited : MSG.server);
  }

  if (status) return <ThankYou duplicate={status === "duplicate"} />;

  const nameErrId = `${id}-name-err`;
  const emailErrId = `${id}-email-err`;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-busy={loading}>
      {/* Honeypot - hidden from humans and assistive tech */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          opacity: 0,
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`${id}-name`} className="sr-only">
          اسمك
        </label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          name="name"
          type="text"
          autoComplete="given-name"
          placeholder="اسمك"
          className="field"
          value={name}
          maxLength={120}
          disabled={loading}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? nameErrId : undefined}
          onChange={e => {
            setName(e.target.value);
            if (errors.name) setErrors(s => ({ ...s, name: validateName(e.target.value) }));
          }}
          onBlur={() => {
            if (name !== "" || errors.name) setErrors(s => ({ ...s, name: validateName(name) }));
          }}
        />
        {errors.name && (
          <p id={nameErrId} role="alert" className="mt-1.5 text-[13px] leading-snug text-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-email`} className="sr-only">
          بريدك الإلكتروني
        </label>
        <input
          ref={emailRef}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          dir="ltr"
          placeholder="بريدك الإلكتروني"
          className="field"
          value={email}
          maxLength={320}
          disabled={loading}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? emailErrId : undefined}
          onChange={e => {
            setEmail(e.target.value);
            if (errors.email) setErrors(s => ({ ...s, email: validateEmail(e.target.value) }));
          }}
          onBlur={() => {
            if (email !== "" || errors.email) setErrors(s => ({ ...s, email: validateEmail(email) }));
          }}
        />
        {errors.email && (
          <p id={emailErrId} role="alert" className="mt-1.5 text-[13px] leading-snug text-error">
            {errors.email}
          </p>
        )}
      </div>

      <button type="submit" className="btn-cta w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>لحظة…</span>
          </>
        ) : (
          <>
            <span>{CTA_LABEL}</span>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </>
        )}
      </button>

      {serverError && (
        <p role="alert" className="text-center text-[13px] leading-snug text-error">
          {serverError}
        </p>
      )}

      <p className="t-cap text-center">{MICRO_COPY}</p>
    </form>
  );
}

/**
 * Link people share. When the page is embedded (e.g. in a Blogger page at
 * techalaraj.com/ai) the embed passes its own address as ?share=..., so
 * friends get the nice link instead of the github.io one.
 */
function shareUrl(): string {
  try {
    const s = new URLSearchParams(window.location.search).get("share");
    if (s && /^https:\/\/[^\s"<>]+$/.test(s)) return s;
  } catch {
    /* ignore */
  }
  return window.location.origin + window.location.pathname;
}

function ThankYou({ duplicate }: { duplicate: boolean }) {
  const pageUrl = typeof window !== "undefined" ? shareUrl() : "";
  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `كورس ومجتمع الذكاء الاصطناعي مع محمد الأعرج - سجّل بقائمة الانتظار وخذ دليل 30 أداة مجاناً: ${pageUrl}`,
  )}`;

  return (
    <div className="pop-in flex flex-col items-center gap-4 py-2 text-center" role="status" aria-live="polite">
      <svg viewBox="0 0 52 52" className="check-draw h-14 w-14" aria-hidden="true">
        <circle cx="26" cy="26" r="24" fill="none" stroke="#34D399" strokeWidth="3" />
        <path d="M15 27l7 7 15-15" fill="none" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {duplicate ? (
        <p className="t-h3 text-fg">إنت مسجّل أصلاً بقائمة الانتظار 👌 أول ما نطلق رح يوصلك الخبر على إيميلك.</p>
      ) : (
        <>
          <h3 className="t-h3 text-fg">تمام! اسمك صار بقائمة الانتظار 🎉</h3>
          <p className="text-[15px] leading-relaxed text-fg-2">
            شكراً إنك قررت تكون جزء من البداية. أول ما نطلق، رح يوصلك الخبر على إيميلك مع تفاصيل أولوية الدخول والسعر الخاص
            بالمؤسسين. خليك قريب!
          </p>
        </>
      )}

      <div className="w-full rounded-2xl border border-yellow/30 bg-yellow/[0.07] p-4 text-start">
        <p className="flex items-center gap-2 text-[15px] font-bold text-fg">
          <Gift className="h-5 w-5 flex-none text-yellow" aria-hidden="true" />
          <span>هديتك جاهزة 🎁</span>
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-fg-2">
          دليل «30 أداة ذكاء اصطناعي لازم تعرفها»: شو بتعمل كل أداة، وكيف تبدأ فيها من اليوم.
        </p>
        <a className="btn-cta mt-3 w-full !text-[15px]" href={GUIDE_URL} download={GUIDE_FILE} target="_blank" rel="noopener">
          <Download className="h-5 w-5" aria-hidden="true" />
          <span>
            حمّل الدليل (<span className="ltr">PDF · 2.8 MB</span>)
          </span>
        </a>
      </div>

      <p className="text-[14px] font-semibold text-fg">
        محمد الأعرج — <bdi dir="ltr">TechAlaraj</bdi>
      </p>

      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <a className="btn-ghost flex-1" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          <InstagramIcon />
          <span>تابعني على إنستغرام</span>
        </a>
        <a className="btn-ghost flex-1" href={waHref} target="_blank" rel="noopener noreferrer">
          <Share2 className="h-5 w-5" aria-hidden="true" />
          <span>شارك الصفحة مع صاحبك</span>
        </a>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Smooth-scroll to the hero form and focus its name field. */
export function scrollToHeroForm() {
  const target = document.getElementById("join");
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  window.setTimeout(
    () => (document.getElementById("hero-name") as HTMLInputElement | null)?.focus({ preventScroll: true }),
    reduce ? 0 : 500,
  );
}
