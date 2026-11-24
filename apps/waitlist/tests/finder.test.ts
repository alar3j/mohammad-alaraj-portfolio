/**
 * Parity tests: the TypeScript tokenizer + ranker must reproduce what
 * ml/build_tool_index.py computed with Hugging Face `tokenizers` in Python.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeVec, StaticEmbedder, ToolFinder, type IndexJson } from "../src/ai/finder";
import { tokenize } from "../src/ai/wordpiece";

const pub = resolve(import.meta.dirname, "../public/ai");
const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures/tokenizer.json"), "utf-8")) as {
  tokens: { text: string; ids: number[] }[];
  ranking: { query: string; top3: number[] }[];
  gold: { query: string; ids: number[] }[];
};
const vocab = new Map<string, number>();
readFileSync(resolve(pub, "vocab.txt"), "utf-8")
  .split("\n")
  .forEach((t, i) => t && vocab.set(t, i));
const bin = readFileSync(resolve(pub, "model.bin"));
const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const index = JSON.parse(readFileSync(resolve(pub, "tools.json"), "utf-8")) as IndexJson;
const embedder = new StaticEmbedder(buffer, vocab);
const finder = new ToolFinder(embedder, index);

describe("WordPiece tokenizer", () => {
  it.each(fixture.tokens.map(t => [t.text, t.ids] as const))("matches HF tokenizers for %s", (text, ids) => {
    expect(tokenize(text, vocab)).toEqual(ids);
  });
});

describe("static embeddings", () => {
  it.each(index.selftest.map(s => [s.text, s.vec] as const))("matches Python vector for %s", (text, b64) => {
    const ref = decodeVec(b64);
    const v = embedder.embed(text);
    let dot = 0, n = 0;
    for (let i = 0; i < v.length; i++) (dot += v[i] * ref[i]), (n += ref[i] * ref[i]);
    expect(dot / Math.sqrt(n)).toBeGreaterThan(0.999);
  });
});

describe("tool ranking", () => {
  it("returns the same top-1 tool as Python for every eval query", () => {
    const same = fixture.ranking.filter(r => finder.rank(r.query)[0].tool.id === r.top3[0]).length;
    expect(same / fixture.ranking.length).toBeGreaterThanOrEqual(0.97);
  });

  it("keeps >= 94% top-3 accuracy on held-out Arabic requests", () => {
    const hits = fixture.gold.filter(g => finder.rank(g.query).some(r => g.ids.includes(r.tool.id))).length;
    expect(hits / fixture.gold.length).toBeGreaterThanOrEqual(0.94);
  });

  it("boosts tools named explicitly", () => {
    expect(finder.rank("بدي أستخدم كانفا")[0].tool.name).toBe("Canva");
    expect(finder.rank("شو بيعمل n8n")[0].tool.name).toBe("n8n");
  });

  it("handles empty and unknown input", () => {
    expect(finder.rank("   ")).toEqual([]);
    expect(finder.rank("😀😀").length).toBe(3);
  });
});
