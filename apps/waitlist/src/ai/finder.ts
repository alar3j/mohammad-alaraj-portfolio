/**
 * In-browser AI tool finder.
 *
 * Model: sentence-transformers/static-similarity-mrl-multilingual-v1
 * (Hugging Face), pruned + int8-quantised by ml/build_tool_index.py.
 * A sentence vector is the mean of its token vectors, then we rank the 30
 * tools of the guide by cosine similarity. Pure TypeScript, no server.
 */
import { tokenize, UNK } from "./wordpiece";

export type Category = { id: number; name: string; en: string; color: string };
export type Tool = {
  id: number;
  name: string;
  cat: number;
  url: string;
  what: string;
  use: string;
  tip: string;
  tipType: "prompt" | "tip";
  aliases: string[];
};
export type Ranked = { tool: Tool; score: number; match: number };

type ToolRecord = Tool & { desc: string; examples: string[] };
export type IndexJson = {
  model: string;
  dims: number;
  weights: { example: number; desc: number; alias: number };
  categories: Category[];
  tools: ToolRecord[];
  selftest: { text: string; vec: string }[];
};

export class StaticEmbedder {
  readonly dims: number;
  private readonly scales: Float32Array;
  private readonly matrix: Int8Array;

  constructor(
    buffer: ArrayBuffer,
    private readonly vocab: Map<string, number>,
  ) {
    const view = new DataView(buffer);
    const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
    if (magic !== "TASE") throw new Error("bad model file");
    const rows = view.getUint32(4, true);
    this.dims = view.getUint32(8, true);
    this.scales = new Float32Array(buffer.slice(12, 12 + rows * 4));
    this.matrix = new Int8Array(buffer, 12 + rows * 4, rows * this.dims);
  }

  embed(text: string): Float32Array {
    const out = new Float32Array(this.dims);
    let n = 0;
    for (const id of tokenize(text, this.vocab)) {
      if (id === UNK) continue;
      const s = this.scales[id];
      const off = id * this.dims;
      for (let d = 0; d < this.dims; d++) out[d] += this.matrix[off + d] * s;
      n++;
    }
    let norm = 0;
    for (let d = 0; d < this.dims; d++) norm += out[d] * out[d];
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < this.dims; d++) out[d] /= norm;
    return out;
  }
}

export function decodeVec(b64: string): Int8Array {
  const bin = atob(b64);
  const v = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) v[i] = (bin.charCodeAt(i) << 24) >> 24;
  return v;
}

function dotQ(q: Float32Array, v: Int8Array): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += q[i] * v[i];
  return s / 127;
}

export class ToolFinder {
  readonly tools: Tool[];
  readonly categories: Category[];
  private readonly desc: Int8Array[];
  private readonly examples: Int8Array[][];

  constructor(
    readonly embedder: StaticEmbedder,
    private readonly index: IndexJson,
  ) {
    this.tools = index.tools.map(({ desc: _d, examples: _e, ...t }) => t);
    this.categories = index.categories;
    this.desc = index.tools.map(t => decodeVec(t.desc));
    this.examples = index.tools.map(t => t.examples.map(decodeVec));
  }

  rank(query: string, k = 3): Ranked[] {
    const text = query.trim();
    if (!text) return [];
    const q = this.embedder.embed(text);
    const ql = text.normalize("NFKC").toLowerCase();
    const { example: wEx, desc: wDesc, alias } = this.index.weights;
    const scored = this.tools.map((tool, i) => {
      let best = -1;
      for (const e of this.examples[i]) best = Math.max(best, dotQ(q, e));
      let score = wEx * best + wDesc * dotQ(q, this.desc[i]);
      if (tool.aliases.some(a => a && ql.includes(a))) score += alias;
      return { tool, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.score ?? 0;
    // "match" is a friendly 0-100 figure for the UI, relative to the best hit.
    return scored.slice(0, k).map(s => ({
      ...s,
      match: Math.round(Math.max(0, Math.min(1, s.score / Math.max(top, 1e-6))) * 100 * Math.min(1, 0.55 + top)),
    }));
  }
}

let loading: Promise<ToolFinder> | null = null;

/** Loads the ~2.3 MB model once; reports download progress 0..1. */
export function loadFinder(base: string, onProgress?: (p: number) => void): Promise<ToolFinder> {
  if (!loading) {
    loading = (async () => {
      const [index, vocabText, buffer] = await Promise.all([
        fetch(`${base}ai/tools.json`).then(r => r.json() as Promise<IndexJson>),
        fetch(`${base}ai/vocab.txt`).then(r => r.text()),
        fetchWithProgress(`${base}ai/model.bin`, onProgress),
      ]);
      const vocab = new Map<string, number>();
      vocabText.split("\n").forEach((tok, i) => tok && vocab.set(tok, i));
      return new ToolFinder(new StaticEmbedder(buffer, vocab), index);
    })().catch(err => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

async function fetchWithProgress(url: string, onProgress?: (p: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 2_300_000;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(0.99, got / total));
  }
  const out = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) out.set(c, off), (off += c.length);
  onProgress?.(1);
  return out.buffer;
}
