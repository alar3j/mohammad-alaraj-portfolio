import { Hl, VerifiedBadge } from "@/components/ui";
import { WaitlistForm } from "@/components/WaitlistForm";
import { IMG } from "@/config";
import { hasWebGL, isLowPower, useInViewport, useReducedMotion, whenIdle } from "@/lib/env";
import { Gift, Sparkles } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const HeroScene = lazy(() => import("@/three/HeroScene"));

export function Hero() {
  return (
    <section className="relative pb-14 pt-2 md:pt-6 lg:pb-20 lg:pt-2" aria-labelledby="hero-title">
      <div className="wrap grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-6">
        {/* copy + form */}
        <div className="relative z-[2] flex min-w-0 flex-col gap-3 md:gap-4">
          <span className="pill self-start text-[12.5px] text-fg md:text-[13px]">
            <Sparkles className="h-3.5 w-3.5 text-yellow" aria-hidden="true" />
            قريباً · كورس + مجتمع ذكاء اصطناعي
          </span>

          <h1 id="hero-title" className="t-h1 text-fg">
            الذكاء الاصطناعي مش بس أدوات تتفرّج عليها.
            <span className="hl-line lg:!mt-[0.18em]">
              <Hl>تعلّم كيف تستخدمها وتبني فيها.</Hl>
            </span>
          </h1>

          <p className="t-lead max-w-[560px] !text-[15px] md:!text-[18px]">
            كورس عملي ومجتمع عربي مع محمد الأعرج، يساعدك تتعلّم وتطبّق وتبني اللي بتحتاجه بشغلك ومشاريعك باستخدام الذكاء
            الاصطناعي.
          </p>

          <div id="join" className="glass mt-1 max-w-[540px] scroll-mt-24 p-4 md:p-6">
            <h2 className="text-[17px] font-bold leading-snug text-fg md:text-[20px]">احجز مكانك بقائمة الانتظار</h2>
            <p className="mb-3 mt-1 text-[13.5px] leading-[1.65] text-fg-2 md:mb-4 md:text-[15px]">
              سجّل لتوصلك أخبار الإطلاق أول بأول، مع أولوية الدخول والسعر الخاص بالمؤسسين.
            </p>
            <p className="mb-3 flex items-center gap-2 rounded-xl border border-yellow/25 bg-yellow/[0.07] px-3 py-2 text-[13px] font-semibold leading-snug text-fg md:mb-4 md:text-[14px]">
              <Gift className="h-4 w-4 flex-none text-yellow" aria-hidden="true" />
              <span>
                هدية فورية: دليل <bdi>«30 أداة ذكاء اصطناعي»</bdi> PDF بتحمّله أول ما تسجّل.
              </span>
            </p>
            <WaitlistForm id="hero" />
          </div>

          <p className="flex max-w-[540px] flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-2">
            <VerifiedBadge className="h-4 w-4 flex-none" />
            <span>
              <bdi dir="ltr" className="ltr">
                +280
              </bdi>{" "}
              ألف متابع عبر المنصات · حساب إنستغرام موثّق
            </span>
          </p>
        </div>

        <HeroPortrait />
      </div>
    </section>
  );
}

/** Static photo first (fast LCP), the WebGL portrait fades in when idle. */
function HeroPortrait() {
  const reduced = useReducedMotion();
  const [want3D, setWant3D] = useState(false);
  const [ready, setReady] = useState(false);
  const [lowPower, setLowPower] = useState(true);
  const [ref, visible] = useInViewport<HTMLDivElement>("120px");
  const onReady = useCallback(() => window.setTimeout(() => setReady(true), 120), []);

  useEffect(() => {
    if (reduced || !hasWebGL()) return;
    setLowPower(isLowPower());
    return whenIdle(() => setWant3D(true), 1200);
  }, [reduced]);

  return (
    <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[440px]">
      <div ref={ref} className="relative aspect-[640/858] w-full">
        <div className="hero-glow absolute inset-x-[-25%] bottom-[-5%] top-[8%] rounded-full" aria-hidden="true" />

        {want3D && (
          <div
            className={`canvas-fade absolute left-[-25%] top-[-15%] h-[130%] w-[150%] ${ready ? "opacity-100" : "opacity-0"}`}
            style={{
              WebkitMaskImage: "radial-gradient(closest-side, #000 58%, transparent 100%)",
              maskImage: "radial-gradient(closest-side, #000 58%, transparent 100%)",
            }}
          >
            <Suspense fallback={null}>
              <HeroScene
                map={IMG.hero}
                depth={IMG.heroDepth}
                aspect={640 / 858}
                active={visible}
                reduced={reduced}
                lowPower={lowPower}
                onReady={onReady}
              />
            </Suspense>
          </div>
        )}

        <img
          src={IMG.hero}
          alt="محمد الأعرج"
          width={640}
          height={858}
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className={`canvas-fade relative block h-auto w-full select-none ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
          }}
        />
      </div>
      {want3D && ready && (
        <p className="relative z-[2] mt-1 text-center text-[11.5px] text-fg-3">
          حرّك الماوس أو الجوال · صورة ثلاثية الأبعاد بعمق محسوب بالذكاء الاصطناعي
        </p>
      )}
    </div>
  );
}
