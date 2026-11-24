import { Faq } from "@/components/Faq";
import { CountUp, Hl, L, Reveal, SectionHead, TiltCard, VerifiedBadge } from "@/components/ui";
import { scrollToHeroForm, WaitlistForm } from "@/components/WaitlistForm";
import { IMG, INSTAGRAM_URL, SITE_HOME, logo } from "@/config";
import {
  BellRing,
  BriefcaseBusiness,
  CircleHelp,
  Compass,
  Gift,
  Handshake,
  Heart,
  KeyRound,
  Layers,
  MessageCircle,
  PlayCircle,
  RefreshCw,
  Share2,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------ top bar -- */
export function TopBar() {
  return (
    <header className="relative z-10">
      <div className="wrap flex h-16 items-center justify-between gap-3">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-yellow/30 bg-ink text-[15px] font-bold text-yellow">
            <L>A</L>
          </span>
          <bdi dir="ltr" className="ltr">
            @techalaraj
          </bdi>
          <VerifiedBadge className="h-[18px] w-[18px]" />
        </a>
        <span className="pill text-fg">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          قائمة الانتظار مفتوحة
        </span>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------- marquee -- */
const TOOLS: [number, string][] = [
  [1, "ChatGPT"], [2, "Gemini"], [3, "Claude"], [4, "Copilot"], [5, "DeepSeek"], [6, "Grok"], [7, "Meta AI"],
  [8, "Perplexity"], [9, "NotebookLM"], [10, "Manus"], [11, "Notion AI"], [12, "Gamma"], [13, "Napkin AI"],
  [14, "Canva"], [15, "Midjourney"], [16, "Ideogram"], [17, "Firefly"], [18, "Photoroom"], [19, "CapCut"],
  [20, "Runway"], [21, "Kling"], [22, "Hailuo"], [23, "Veo"], [24, "HeyGen"], [25, "Opus Clip"],
  [26, "ElevenLabs"], [27, "Suno"], [28, "Lovable"], [29, "Zapier"], [30, "n8n"],
];

export function ToolMarquee() {
  const row = (
    <ul className="flex shrink-0 items-center gap-7 pe-7 md:gap-9 md:pe-9" dir="ltr">
      {TOOLS.map(([id, name]) => (
        <li key={id} className="flex items-center gap-2.5 whitespace-nowrap">
          <img
            src={logo(id)}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-9 w-9 select-none rounded-[10px] shadow-[0_6px_18px_-8px_rgba(0,0,0,.8)] md:h-10 md:w-10"
          />
          <span className="ltr text-[14px] font-semibold text-fg-2 md:text-[15px]">{name}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative border-y border-white/[0.05] py-5" aria-label="30 أداة بالدليل">
      <p className="mb-4 text-center text-[13px] font-semibold text-fg-3">
        الـ<L>30</L> أداة اللي بيشرحها الدليل المجاني
      </p>
      <p className="sr-only">الأدوات: {TOOLS.map(t => t[1]).join("، ")}</p>
      <div
        className="marquee-wrap overflow-hidden"
        aria-hidden="true"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
        }}
        dir="ltr"
      >
        <div className="marquee">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- who -- */
export function WhoSection() {
  const cards: { icon: ReactNode; text: ReactNode }[] = [
    { icon: <Layers className="h-5 w-5" />, text: <>كل يوم بتشوف أدوات <L>AI</L> جديدة، وبتحتار أي وحدة تستاهل وقتك.</> },
    { icon: <MessageCircle className="h-5 w-5" />, text: <>جرّبت <L>ChatGPT</L> وأدوات ثانية، بس حاسس إنك لسا ما استفدت منها بشكل حقيقي.</> },
    { icon: <BriefcaseBusiness className="h-5 w-5" />, text: <>عندك شغل أو مشروع، وبدك تعرف كيف تستخدم الذكاء الاصطناعي لتنجز مهامك بطريقة أذكى.</> },
    { icon: <PlayCircle className="h-5 w-5" />, text: <>بتحضر فيديوهات وشروحات، بس لما تيجي تطبّق لحالك بتحتار من وين تبدأ.</> },
    { icon: <TrendingUp className="h-5 w-5" />, text: <>بدك تطوّر مهاراتك، بس مش حابب تضيّع وقتك بالتجربة العشوائية.</> },
  ];

  return (
    <section className="section" aria-labelledby="who-title">
      <div className="wrap">
        <SectionHead kicker="هل هذا أنت؟" id="who-title">
          بتسمع عن الذكاء الاصطناعي كل يوم…{" "}
          <span className="hl-line">
            <Hl>بس لسا مش عارف كيف تستفيد منه فعلاً؟</Hl>
          </span>
        </SectionHead>

        <ul className="flex flex-wrap justify-center gap-3 md:gap-4">
          {cards.map((c, i) => (
            <Reveal as="li" key={i} delay={i * 70} className="w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]">
              <TiltCard className="card flex h-full items-start gap-4 p-5 md:p-6">
                <span className="icon-chip" aria-hidden="true">
                  {c.icon}
                </span>
                <p className="pt-1.5 text-[15px] leading-[1.8] text-fg md:text-[16px]">{c.text}</p>
              </TiltCard>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mx-auto mt-10 max-w-[720px] text-center">
          <p className="text-[16px] leading-[1.9] text-fg md:text-[18px]">
            إذا لقيت حالك بوحدة من هالنقاط، هالمكان معمول إلك. مش مطلوب تكون خبير، المهم تكون مستعد تتعلّم وتجرّب وتطبّق.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ learn -- */
export function LearnSection() {
  const items = [
    { n: "01", t: "استخدم أدوات الذكاء الاصطناعي بذكاء", d: "اعرف كيف تختار الأداة المناسبة لكل مهمة، بدل ما تتشتت بين عشرات الخيارات." },
    { n: "02", t: "اطلب النتائج اللي بدك إياها", d: "اكتب تعليمات واضحة للذكاء الاصطناعي، وتعلّم كيف تحسّن النتيجة بدل ما تكتفي بأول إجابة." },
    { n: "03", t: "خلّي شغلك اليومي أسهل", d: "طرق عملية لاستخدام الذكاء الاصطناعي بالبحث والكتابة والتخطيط وتنظيم المهام." },
    { n: "04", t: "طوّر شغلك ومحتواك", d: "استخدم الذكاء الاصطناعي لتوليد الأفكار وتحضير المحتوى وتطوير طريقة شغلك." },
    { n: "05", t: "ابنِ حلول تناسبك", d: "حوّل فكرة أو مشكلة عندك لحل عملي باستخدام أدوات الذكاء الاصطناعي المناسبة." },
    { n: "06", t: "من التجربة للتطبيق", d: "بدل ما تجمع أدوات وروابط ما بترجعلها، ركّز إنك تستخدم اللي تعلّمته بشي بتحتاجه فعلاً." },
  ];

  return (
    <section className="section" aria-labelledby="learn-title">
      <div className="wrap">
        <SectionHead
          kicker="شو رح تتعلّم وتبني؟"
          id="learn-title"
          intro="الفكرة بسيطة: نتعلّم الذكاء الاصطناعي من خلال استخدامات حقيقية، ونحوّل اللي بنتعلّمه لشي بيفيدنا."
        >
          مش بس تعرف الأدوات.{" "}
          <span className="hl-line">
            <Hl>تعرف شو تعمل فيها.</Hl>
          </span>
        </SectionHead>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.n} delay={(i % 3) * 80}>
              <TiltCard
                as="article"
                className={`card group flex h-full flex-col gap-3 overflow-hidden p-6 md:p-7 ${
                  i === 0 || i === 5 ? "bg-[linear-gradient(135deg,rgba(37,99,235,0.16),transparent_60%)]" : ""
                }`}
              >
                <span className="num-badge self-start">{it.n}</span>
                <h3 className="t-h3 text-fg">{it.t}</h3>
                <p className="text-[15px] leading-[1.85] text-fg-2 md:text-[16px]">{it.d}</p>
                <span
                  className="ltr pointer-events-none absolute -bottom-6 end-3 select-none text-[96px] font-black leading-none text-white/[0.03]"
                  aria-hidden="true"
                >
                  {it.n}
                </span>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-14 max-w-[780px] text-center">
          <p className="text-[21px] font-bold leading-[1.7] text-fg md:text-[28px]">
            الهدف مش إنك تعرف كل أدوات <L>AI</L> بالعالم.{" "}
            <span className="hl-line">
              <Hl>الهدف إنك تعرف كيف تستفيد منها.</Hl>
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- community -- */
export function CommunitySection() {
  const points = [
    { icon: <CircleHelp className="h-5 w-5" />, t: "تسأل لما تحتاج مساعدة", d: "بدل ما تضل عالق لحالك." },
    { icon: <Users className="h-5 w-5" />, t: "تتعلّم من تجارب غيرك", d: "أفكار وتطبيقات من ناس عندهم مشاريع واحتياجات مختلفة." },
    { icon: <Share2 className="h-5 w-5" />, t: "تشارك اللي بتبنيه", d: "محتوى، مشروع، أو طريقة شغل جديدة." },
    { icon: <RefreshCw className="h-5 w-5" />, t: "تتطوّر مع المجال", d: "لأن الذكاء الاصطناعي بيتغيّر باستمرار، والتعلّم ما لازم يوقف عند آخر درس." },
  ];

  return (
    <section className="section border-t border-white/[0.05] bg-ink-2" aria-labelledby="community-title">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
        <Reveal>
          <p className="kicker mb-4">أكثر من كورس</p>
          <h2 id="community-title" className="t-h2 text-fg">
            التعلّم لحالك ممكن.{" "}
            <span className="hl-line">
              <Hl>بس وجود ناس معك بيفرق.</Hl>
            </span>
          </h2>
          <p className="mt-5 text-[15px] leading-[1.95] text-fg-2 md:text-[17px]">
            أكيد بتقدر تتعلّم كثير من المحتوى المجاني. بس أحياناً المشكلة مش بنقص المعلومات… المشكلة إنك تبدأ، توقف عند خطوة،
            وما تعرف كيف تكمّل. عشان هيك الفكرة مش كورس تحضره وتسكّره، الفكرة مجتمع عربي بيجمع ناس بدها تستخدم الذكاء الاصطناعي
            فعلاً.
          </p>

          <ul className="mt-7 flex flex-col gap-4">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span className="icon-chip" aria-hidden="true">
                  {p.icon}
                </span>
                <p className="pt-1.5 text-[15px] leading-[1.8] md:text-[16px]">
                  <strong className="font-semibold text-fg">{p.t}</strong>
                  <span className="text-fg-2"> — {p.d}</span>
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <CommunityFeedMock />
        </Reveal>
      </div>

      <Reveal className="wrap mt-16 text-center md:mt-20">
        <p className="text-[22px] font-bold leading-[1.7] text-fg md:text-[34px]">
          الكورس بيساعدك تتعلّم.{" "}
          <span className="hl-line">
            <Hl>والمجتمع بيساعدك تكمّل.</Hl>
          </span>
        </p>
      </Reveal>
    </section>
  );
}

function SkeletonBar({ w }: { w: string }) {
  return <span className="block h-2.5 rounded-full bg-white/10" style={{ width: w }} />;
}

function FeedPost({ text, tone }: { text: ReactNode; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink/80 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-9 w-9 flex-none rounded-full" style={{ background: tone }} aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-1.5">
          <SkeletonBar w="38%" />
          <SkeletonBar w="22%" />
        </div>
      </div>
      <p className="text-[15px] leading-[1.8] text-fg">{text}</p>
      <div className="mt-3 flex items-center gap-4 text-fg-2/70" aria-hidden="true">
        <Heart className="h-4 w-4" />
        <MessageCircle className="h-4 w-4" />
        <SkeletonBar w="18%" />
      </div>
    </div>
  );
}

function CommunityFeedMock() {
  return (
    <figure className="relative lg:min-h-[640px]" aria-label="معاينة تقريبية لشكل المجتمع">
      <div className="hero-glow absolute -inset-8 opacity-40" aria-hidden="true" />
      <img
        src={IMG.community}
        alt="محمد الأعرج يستخدم جواله"
        width={520}
        height={711}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="relative mx-auto block h-auto w-[230px] select-none sm:w-[260px] lg:absolute lg:end-[-28px] lg:top-0 lg:mx-0 lg:w-[320px]"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, #000 58%, transparent 95%)",
          maskImage: "linear-gradient(to bottom, #000 58%, transparent 95%)",
        }}
      />
      <div className="glass relative -mt-28 overflow-hidden p-4 md:p-5 lg:top-[200px] lg:me-[150px] lg:mt-0">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[12px] text-fg-2">شكل تقريبي</span>
        </div>
        <div className="flex flex-col gap-3">
          <FeedPost tone="linear-gradient(135deg,#2563EB,#1E3A8A)" text="سؤال: كيف بكتب برومبت أفضل لهالمهمة؟" />
          <FeedPost tone="linear-gradient(135deg,#FFD400,#B45309)" text="شاركت أول أتمتة عملتها 🎉" />
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-4" aria-hidden="true">
            <span className="h-9 w-9 flex-none rounded-full bg-white/[0.06]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonBar w="70%" />
              <SkeletonBar w="45%" />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ about -- */
export function AboutSection() {
  const stats = [
    { v: "280K+", l: "متابع عبر المنصات" },
    { v: "181K", l: "على إنستغرام (موثّق)" },
    { v: "3.1M", l: "مشاهدة لأعلى ريل" },
    { v: "2.5M+", l: "مشاهدة آخر 30 يوم" },
  ];

  return (
    <section className="section" aria-label="مين محمد الأعرج؟">
      <div className="wrap">
        <Reveal className="glass p-5 md:p-10">
          <p className="kicker mb-6">مين محمد الأعرج؟</p>
          <div className="grid gap-7 md:grid-cols-[210px_1fr] md:gap-10">
            <div className="flex items-start gap-4 md:flex-col md:items-center">
              <div className="relative flex-none">
                <div className="rounded-full bg-[conic-gradient(from_180deg,#FFD400,#2563EB,#38BDF8,#FFD400)] p-[3px]">
                  <img
                    src={IMG.about}
                    alt="صورة محمد الأعرج"
                    width={400}
                    height={400}
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-24 rounded-full border-4 border-surface object-cover md:h-44 md:w-44"
                  />
                </div>
                <span className="absolute bottom-1 end-1 rounded-full bg-surface p-0.5 md:bottom-3 md:end-3">
                  <VerifiedBadge className="h-6 w-6 md:h-7 md:w-7" />
                </span>
              </div>
              <h2 className="t-h2 self-center text-fg md:hidden">أهلاً، أنا محمد الأعرج 👋</h2>
            </div>

            <div>
              <h2 className="t-h2 mb-4 hidden text-fg md:block">أهلاً، أنا محمد الأعرج 👋</h2>
              <div className="flex flex-col gap-3 text-[15px] leading-[1.95] text-fg-2 md:text-[17px]">
                <p>صانع محتوى تقني من عمّان، الأردن. بحاول أقرّب الذكاء الاصطناعي للناس بطريقة بسيطة وعملية، بعيد عن التعقيد والمبالغة.</p>
                <p className="font-semibold text-fg">شعاري دايماً: «أجرّب التقنية كما يستخدمها الناس فعلاً».</p>
                <p>
                  شاركت تجارب وأدوات ذكاء اصطناعي وصلت لملايين المشاهدات، وتعاونت مع شركات ذكاء اصطناعي مثل <L>Manus</L> و
                  <L>MiniMax</L>.
                </p>
                <p>
                  واليوم بدي آخذها خطوة أبعد: بدل ما تتابع فيديو قصير وتروح تجرّب لحالك، بدي أبني مكان نتعلّم فيه بشكل عملي، نشارك
                  تجاربنا، ونساعد بعض نحوّل الأفكار لتطبيقات حقيقية.
                </p>
                <p className="text-[17px] leading-[1.8] md:text-[20px]">
                  <Hl>بدي إياك تستفيد من الذكاء الاصطناعي، مش بس تنبهر فيه.</Hl>
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-4 md:gap-4">
            {stats.map(s => (
              <div key={s.v} className="rounded-2xl border border-white/[0.06] bg-ink/60 p-4 text-center md:p-5">
                <dt className="sr-only">{s.l}</dt>
                <dd>
                  <CountUp value={s.v} className="ltr block text-[28px] font-bold leading-tight text-fg md:text-[36px]" />
                  <span className="mt-1 block text-[13px] leading-snug text-fg-2 md:text-[14px]">{s.l}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-[14px] text-fg-2">
            <span className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-yellow" aria-hidden="true" />
              تعاونات مع:
            </span>
            <ul className="flex flex-wrap items-center justify-center gap-2.5">
              <PartnerChip name="Manus">
                <img src={logo(10)} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-[10px]" />
              </PartnerChip>
              <PartnerChip name="MiniMax">
                <MiniMaxLogo />
              </PartnerChip>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PartnerChip({ name, children }: { name: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-ink/60 py-1.5 pe-4 ps-1.5">
      {children}
      <span className="ltr text-[15px] font-semibold text-fg">{name}</span>
    </li>
  );
}

/** MiniMax mark (from MiniMax's own repo, via simple-icons) on a white tile like the guide's logos. */
function MiniMaxLogo() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="#E73562">
        <path d="M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------ perks -- */
export function PerksSection() {
  const perks = [
    {
      icon: <Gift className="h-5 w-5" />,
      t: "هدية فورية: دليل 30 أداة ذكاء اصطناعي",
      d: "أول ما تسجّل بتحمّل الدليل PDF: 30 أداة بـ7 أقسام، شو بتعمل كل وحدة، ونصيحة أو برومبت تجرّبه فوراً، مع خطة لأول 7 أيام.",
      wide: true,
    },
    { icon: <KeyRound className="h-5 w-5" />, t: "أولوية الدخول", d: "المسجّلين بقائمة الانتظار إلهم الأولوية لما يفتح باب الانضمام." },
    { icon: <Tag className="h-5 w-5" />, t: "سعر خاص للمؤسسين", d: "رح يكون في سعر خاص للمسجّلين الأوائل، وتفاصيله بنعلنها مع الإطلاق." },
    { icon: <BellRing className="h-5 w-5" />, t: "خبر الإطلاق أول بأول", d: "ما رح تحتاج تضل تراقب الحسابات، الخبر بيوصلك على إيميلك." },
    { icon: <Compass className="h-5 w-5" />, t: "بدون أي التزام", d: "تسجيلك بقائمة الانتظار ما بيلزمك تشترك وقت الإطلاق." },
  ];

  return (
    <section className="section pt-0 lg:pt-0" aria-labelledby="perks-title">
      <div className="wrap">
        <Reveal className="perks-box p-5 md:p-12">
          <div className="mx-auto mb-8 max-w-[680px] text-center md:mb-10">
            <p className="kicker mb-4">ليش تسجّل من هلأ؟</p>
            <h2 id="perks-title" className="t-h2 text-fg">
              <Hl>خليك من أوائل الناس اللي بتعرف.</Hl>
            </h2>
            <p className="t-lead mt-4">لسا ما أطلقنا الكورس والمجتمع، بس إذا مهتم تكون معنا من البداية، قائمة الانتظار هي أول خطوة.</p>
          </div>

          <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
            {perks.map((p, i) => (
              <li
                key={i}
                className={`flex items-start gap-4 rounded-2xl border p-4 md:p-5 ${
                  p.wide ? "border-yellow/30 bg-yellow/[0.06] md:col-span-2" : "border-white/[0.06] bg-ink/50"
                }`}
              >
                <span className="icon-chip" aria-hidden="true">
                  {p.icon}
                </span>
                <div className="pt-0.5">
                  <h3 className="text-[16px] font-semibold leading-relaxed text-fg md:text-[18px]">{p.t}</h3>
                  <p className="mt-1 text-[14.5px] leading-[1.8] text-fg-2 md:text-[15.5px]">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex justify-center">
            <button type="button" className="btn-cta w-full sm:w-auto sm:min-w-[320px]" onClick={scrollToHeroForm}>
              احجز مكانك بقائمة الانتظار
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- faq -- */
export function FaqSection() {
  return (
    <section className="section pt-0 lg:pt-0" aria-labelledby="faq-title">
      <div className="wrap">
        <div className="mx-auto max-w-[780px]">
          <Reveal className="mb-8 text-center md:mb-10">
            <p className="kicker mb-4">عندك سؤال؟</p>
            <h2 id="faq-title" className="t-h2 text-fg">
              أسئلة شائعة
            </h2>
          </Reveal>
          <Reveal>
            <Faq />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- final cta -- */
export function FinalCta() {
  return (
    <section className="section relative pt-0 lg:pt-0" aria-labelledby="final-title">
      <div className="hero-glow pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[440px] max-w-[900px] opacity-50" aria-hidden="true" />
      <div className="wrap relative flex items-end justify-center gap-6">
        <img
          src={IMG.final}
          alt="محمد الأعرج"
          width={520}
          height={664}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="hidden h-auto w-[300px] flex-none select-none lg:order-2 lg:block"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
          }}
        />
        <div id="final-join" className="glass w-full max-w-[720px] p-5 md:p-10 lg:order-1">
          <h2 id="final-title" className="t-h2 text-center text-fg">
            كل يوم بتنزل أدوات ذكاء اصطناعي جديدة.{" "}
            <span className="hl-line">
              <Hl>السؤال: كم وحدة استفدت منها فعلاً؟</Hl>
            </span>
          </h2>
          <p className="mx-auto mb-7 mt-5 max-w-[600px] text-center text-[15px] leading-[1.9] text-fg-2 md:text-[17px]">
            مش لازم تعرف كل أداة، ومش لازم تكون خبير عشان تبدأ. بس لازم تبدأ تتعلّم كيف تستخدم الأدوات اللي بين إيديك. إذا بدك تكون
            جزء من مجتمع عربي بيتعلّم ويطبّق ويبني بالذكاء الاصطناعي، سجّل معنا من البداية.
          </p>
          <div className="mx-auto max-w-[480px]">
            <WaitlistForm id="final" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- footer -- */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] pb-24 pt-8 md:pb-10">
      <div className="wrap flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13px] text-fg-2">
        <bdi dir="ltr">© TechAlaraj</bdi>
        <span aria-hidden="true">·</span>
        <a href={SITE_HOME} target="_blank" rel="noopener noreferrer" className="hover:text-fg" dir="ltr">
          techalaraj.com
        </a>
        <span aria-hidden="true">·</span>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-fg" dir="ltr">
          instagram.com/techalaraj
        </a>
      </div>
      <p className="wrap mt-3 text-center text-[11.5px] leading-relaxed text-fg-3">
        أسماء الأدوات والعلامات التجارية ملك لأصحابها، ومستخدمة للتعريف فقط. مقترحات الأدوات تقريبية والأدوات بتتغيّر، فشيك دايماً على
        الموقع الرسمي.
      </p>
    </footer>
  );
}
