import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "لازم أكون بعرف بالذكاء الاصطناعي من قبل؟",
    a: "لا. الكورس والمجتمع موجّهين للمبتدئين وأصحاب الخبرة المتوسطة. الفكرة تفهم كيف تستخدم الذكاء الاصطناعي بشكل عملي، مش إنك تدخل وعندك خبرة تقنية كبيرة.",
  },
  {
    q: "لازم أكون مبرمج؟",
    a: "لا. مش مطلوب تكون مبرمج عشان تبدأ. الهدف تتعلّم تستخدم أدوات الذكاء الاصطناعي حسب احتياجك، سواء كنت موظف أو طالب أو صانع محتوى أو صاحب مشروع.",
  },
  {
    q: "كم السعر؟",
    a: "لسا ما أعلنّا السعر النهائي. بس رح يكون في سعر خاص للمؤسسين من المسجّلين الأوائل بقائمة الانتظار، وبنشارك التفاصيل وقت الإطلاق.",
  },
  {
    q: "إمتى بيفتح التسجيل؟",
    a: "لسا ما حددنا موعد معلن. سجّل بقائمة الانتظار، وبيوصلك خبر الإطلاق وأولوية الدخول على إيميلك.",
  },
  {
    q: "شو الفرق بين هذا وبين المحتوى المجاني اللي بتنشره؟",
    a: "بالمحتوى المجاني بعرّفك على أدوات وأفكار جديدة. هون الفكرة أعمق: تعلّم عملي يساعدك تطبّق اللي تعلّمته، مع مجتمع عربي بيشاركك نفس الاهتمام وبيساعدك تكمّل.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const btnId = `faq-btn-${i}`;
        const panelId = `faq-panel-${i}`;
        return (
          <div key={i} className={`card overflow-hidden ${isOpen ? "!border-yellow/25 !bg-surface-2" : ""}`}>
            <h3>
              <button
                id={btnId}
                type="button"
                className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-4 text-start text-[16px] font-semibold leading-relaxed text-fg md:px-6 md:text-[17px]"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <span
                  className={`grid h-8 w-8 flex-none place-items-center rounded-full border transition-all duration-300 ${
                    isOpen ? "rotate-180 border-yellow/40 bg-yellow text-ink" : "border-white/10 text-yellow"
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} className="faq-panel" data-open={isOpen}>
              <div>
                <p className="px-5 pb-5 text-[15px] leading-[1.9] text-fg-2 md:px-6">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
