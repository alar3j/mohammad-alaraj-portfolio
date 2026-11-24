import { useWaitlistStatus } from "@/lib/waitlist";
import { useEffect, useState } from "react";
import { scrollToHeroForm } from "./WaitlistForm";

/** Fixed bottom CTA on < 768px; visible only while neither form is on screen. */
export function StickyCta() {
  const status = useWaitlistStatus();
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const hero = document.getElementById("join");
    const final = document.getElementById("final-join");
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === hero) setHeroVisible(entry.isIntersecting);
        if (entry.target === final) setFinalVisible(entry.isIntersecting);
      });
    });
    if (hero) io.observe(hero);
    if (final) io.observe(final);
    return () => io.disconnect();
  }, []);

  const show = !status && !heroVisible && !finalVisible;

  return (
    <div
      className="sticky-bar fixed inset-x-0 bottom-0 z-40 px-5 pt-3 md:hidden"
      style={{ transform: show ? "translateY(0)" : "translateY(110%)", opacity: show ? 1 : 0 }}
      aria-hidden={!show}
    >
      <button type="button" className="btn-cta w-full" tabIndex={show ? 0 : -1} onClick={scrollToHeroForm}>
        احجز مكانك بقائمة الانتظار
      </button>
    </div>
  );
}
