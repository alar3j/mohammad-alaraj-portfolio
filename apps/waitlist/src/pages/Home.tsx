import { StickyCta } from "@/components/StickyCta";
import {
  AboutSection,
  CommunitySection,
  FaqSection,
  FinalCta,
  Footer,
  LearnSection,
  PerksSection,
  ToolMarquee,
  TopBar,
  WhoSection,
} from "@/sections/Content";
import { Hero } from "@/sections/Hero";
import { ToolFinder } from "@/sections/ToolFinder";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="aurora pointer-events-none absolute inset-x-0 top-0 h-[1000px]" aria-hidden="true" />
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden="true" />
      <TopBar />
      <main className="relative">
        <Hero />
        <ToolMarquee />
        <WhoSection />
        <ToolFinder />
        <LearnSection />
        <CommunitySection />
        <AboutSection />
        <PerksSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
