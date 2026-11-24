/** Public runtime configuration (nothing secret lives in the browser). */
export const WAITLIST_API: string =
  import.meta.env.VITE_WAITLIST_API ?? "https://ienypzfqspjlmjbiujhy.supabase.co/functions/v1/techalaraj-waitlist";

export const BASE = import.meta.env.BASE_URL; // "./" - the site works under any path
export const asset = (path: string) => `${BASE}${path}`;
/** Tool logos extracted from the guide PDF by ml/extract_logos.py (128x128 WebP). */
export const logo = (toolId: number) => asset(`logos/${toolId}.webp`);

export const GUIDE_FILE = "TechAlaraj_30_AI_Tools_Guide.pdf";
export const GUIDE_URL = asset(`guide/${GUIDE_FILE}`);
export const INSTAGRAM_URL = "https://instagram.com/techalaraj";
export const SITE_HOME = "https://techalaraj.com";

export const IMG = {
  hero: asset("img/alaraj-hero.webp"), // 640x858, real photo, background removed
  heroDepth: asset("img/alaraj-hero-depth.png"), // Depth Anything V2 (ml/depth_portrait.py)
  about: asset("img/alaraj-about.webp"), // 400x400
  community: asset("img/alaraj-community.webp"), // 520x711
  final: asset("img/alaraj-final.webp"), // 520x664
  finalDepth: asset("img/alaraj-final-depth.png"),
};
