/**
 * Vite plugin: packs the Thmanyah fonts INTO the site bundle, obfuscated.
 *
 * Why: the Thmanyah Font license (font.thmanyah.com/licenses) allows websites
 * only "as part of a bundled, packaged or obfuscated product" and forbids
 * hosting the font files, making them downloadable, or converting/modifying
 * them. So:
 *   - the official .otf files live in apps/waitlist/fonts-private/ (git-ignored,
 *     never pushed to the public repository, never copied to the build),
 *   - at build time each file's exact bytes are XOR-ed with a random per-build
 *     key and base64-encoded into a lazily loaded JS chunk,
 *   - the browser restores the bytes in memory and registers them with the
 *     FontFace API. No font file URL exists on the site.
 * If the folder is empty, the module exports [] and the site keeps its
 * fallback fonts (IBM Plex Sans Arabic).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

export type FaceSpec = { family: "Thmanyah Sans" | "Thmanyah Serif Display" | "Thmanyah Serif Text"; weight: number };

const WEIGHTS: [RegExp, number][] = [
  [/light/i, 300],
  [/regular|book/i, 400],
  [/medium/i, 500],
  [/black|heavy/i, 900],
  [/bold/i, 700],
];

function describe(file: string): FaceSpec | null {
  const n = file.toLowerCase().replace(/[\s_-]+/g, "");
  if (!/thmanyah|ثمانية/.test(n) || /italic/.test(n)) return null;
  const family = n.includes("serifdisplay")
    ? "Thmanyah Serif Display"
    : n.includes("seriftext")
      ? "Thmanyah Serif Text"
      : n.includes("sans")
        ? "Thmanyah Sans"
        : null;
  const weight = WEIGHTS.find(([re]) => re.test(n))?.[1];
  return family && weight ? { family, weight } : null;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(otf|ttf)$/i.test(f) ? [p] : [];
  });
}

export function thmanyahFonts(dir: string, wanted: FaceSpec[]): Plugin {
  const id = "virtual:thmanyah-fonts";
  const resolved = "\0" + id;
  return {
    name: "thmanyah-fonts",
    resolveId: source => (source === id ? resolved : undefined),
    load(moduleId) {
      if (moduleId !== resolved) return;
      const found = new Map<string, string>();
      for (const file of walk(dir)) {
        const spec = describe(file.split(/[\\/]/).pop()!);
        if (spec) found.set(`${spec.family}|${spec.weight}`, file);
      }
      const faces = wanted.flatMap(w => {
        const file = found.get(`${w.family}|${w.weight}`);
        if (!file) {
          this.warn(`Thmanyah font missing: ${w.family} ${w.weight} (put the official files in ${dir})`);
          return [];
        }
        const bytes = readFileSync(file);
        const key = randomBytes(32);
        const packed = Buffer.alloc(bytes.length);
        for (let i = 0; i < bytes.length; i++) packed[i] = bytes[i] ^ key[(i * 7 + 3) % 32];
        return [{ family: w.family, weight: w.weight, key: key.toString("base64"), data: packed.toString("base64") }];
      });
      return `export default ${JSON.stringify(faces)};`;
    },
  };
}
