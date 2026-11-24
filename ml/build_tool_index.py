#!/usr/bin/env python3
"""Build the in-browser "AI tool finder" index from a Hugging Face model.

Model: sentence-transformers/static-similarity-mrl-multilingual-v1 (Apache-2.0)
  A *static* multilingual embedding model: a sentence vector is simply the mean
  of its WordPiece token vectors. That makes it tiny and instant to run in the
  browser with plain JavaScript (no ONNX/WASM runtime, no server, no API key).

What this script does
  1. Downloads the model from the Hugging Face Hub.
  2. Prunes the 105k-token vocabulary to every Arabic token plus the Latin
     tokens needed for the most frequent English words (wordfreq, --english), the tool
     names and all 1-2 character pieces, truncates the Matryoshka vectors to
     --dims and quantises them to int8 with a per-token scale.
     The evaluation uses a tokenizer rebuilt on the pruned vocabulary, i.e. the
     exact WordPiece behaviour of the JavaScript port.
  3. Embeds every tool of the guide (description + example requests in Levantine
     Arabic) and writes a compact runtime index for the landing page.
  4. Evaluates retrieval on ml/data/eval_queries.json with BOTH the original
     model and the compressed one, so we can see the compression cost.

Outputs (default: apps/waitlist/public/ai/)
  model.bin   header + float32 scales + int8 matrix (vocab_kept x dims)
  vocab.txt   kept WordPiece tokens, one per line (row order of model.bin)
  tools.json  categories, tools and their int8 document vectors

Usage
  python ml/build_tool_index.py            # 192 dims, 6k English words
  python ml/build_tool_index.py --dims 128 --eval-only
"""
from __future__ import annotations

import argparse
import base64
import json
import struct
import unicodedata
from pathlib import Path

import numpy as np
from huggingface_hub import hf_hub_download
from wordfreq import top_n_list
from safetensors.numpy import load_file
from tokenizers import Tokenizer

MODEL_ID = "sentence-transformers/static-similarity-mrl-multilingual-v1"
ROOT = Path(__file__).resolve().parent
DEFAULT_OUT = ROOT.parent / "apps" / "waitlist" / "public" / "ai"

# score = W_EXAMPLE * best example match + W_DESC * description match (+ alias boost)
W_EXAMPLE, W_DESC, ALIAS_BOOST = 0.65, 0.35, 0.35


# ----------------------------------------------------------------- helpers --
def is_arabic(ch: str) -> bool:
    cp = ord(ch)
    return (
        0x0600 <= cp <= 0x06FF  # Arabic
        or 0x0750 <= cp <= 0x077F  # Arabic supplement
        or 0x08A0 <= cp <= 0x08FF  # Arabic extended-A
        or 0xFB50 <= cp <= 0xFDFF  # Arabic presentation forms-A
        or 0xFE70 <= cp <= 0xFEFF  # Arabic presentation forms-B
    )


def body(tok: str) -> str:
    return tok[2:] if tok.startswith("##") else tok


def select_vocab(tokenizer: Tokenizer, tools: list[dict], n_english: int) -> list[str]:
    """Arabic tokens + the Latin pieces real visitors will type."""
    vocab = tokenizer.get_vocab()
    keep = {t for t in vocab if body(t) and all(is_arabic(c) for c in body(t))}
    keep |= {t for t in vocab if body(t).isascii() and len(body(t)) <= 2 and not t.startswith("[")}
    words = top_n_list("en", n_english)
    for t in tools:
        words += [t["name"], *t.get("aliases", []), t["what"], t["use"], *t["queries"]]
    for enc in tokenizer.encode_batch(words, add_special_tokens=False):
        keep |= {tok for tok in enc.tokens if tok != "[UNK]"}
    return sorted(keep, key=lambda t: vocab[t])


def pruned_tokenizer(tokenizer: Tokenizer, kept: list[str]) -> Tokenizer:
    """Same normaliser/pre-tokeniser, WordPiece over the pruned vocab ([UNK] = id 0)."""
    spec = json.loads(tokenizer.to_str())
    spec["model"]["vocab"] = {"[UNK]": 0, **{t: i + 1 for i, t in enumerate(kept)}}
    spec["added_tokens"] = [a for a in spec.get("added_tokens", []) if a["content"] == "[UNK]"]
    for a in spec["added_tokens"]:
        a["id"] = 0
    spec["post_processor"] = None
    return Tokenizer.from_str(json.dumps(spec))


def normalise(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-9)


class StaticModel:
    """Mean-of-token-vectors encoder, optionally over a pruned/quantised table."""

    def __init__(self, tokenizer: Tokenizer, table: np.ndarray, offset: int = 0):
        self.tokenizer = tokenizer
        self.table = table
        self.offset = offset  # pruned tokenizer: id 0 is [UNK], row = id - 1

    def encode(self, texts: list[str]) -> np.ndarray:
        out = []
        for enc in self.tokenizer.encode_batch(texts, add_special_tokens=False):
            ids = [i - self.offset for i in enc.ids if i >= self.offset]
            out.append(self.table[ids].mean(axis=0) if ids else np.zeros(self.table.shape[1], np.float32))
        return normalise(np.asarray(out, dtype=np.float32))


def tool_documents(tool: dict, cats: dict[int, dict]) -> tuple[str, list[str]]:
    desc = f"{tool['name']}. {cats[tool['cat']]['name']}. {tool['what']} {tool['use']}"
    return desc, list(tool["queries"])


def rank(model: StaticModel, tools: list[dict], cats: dict[int, dict], queries: list[str]) -> list[list[int]]:
    descs, ex_owner, ex_texts = [], [], []
    for i, t in enumerate(tools):
        d, ex = tool_documents(t, cats)
        descs.append(d)
        ex_texts += ex
        ex_owner += [i] * len(ex)
    D = model.encode(descs)
    E = model.encode(ex_texts)
    Q = model.encode(queries)
    ex_owner = np.asarray(ex_owner)
    results = []
    for qi, q in enumerate(Q):
        s_desc = D @ q
        s_ex = np.full(len(tools), -1.0)
        np.maximum.at(s_ex, ex_owner, E @ q)
        score = W_EXAMPLE * s_ex + W_DESC * s_desc
        ql = unicodedata.normalize("NFKC", queries[qi]).lower()
        for i, t in enumerate(tools):
            names = [t["name"].lower(), *[a.lower() for a in t.get("aliases", [])]]
            if any(n and n in ql for n in names):
                score[i] += ALIAS_BOOST
        results.append([tools[i]["id"] for i in np.argsort(-score)[:3]])
    return results


def evaluate(name: str, ranked: list[list[int]], gold: list[list[int]]) -> float:
    top1 = sum(r[0] in g for r, g in zip(ranked, gold)) / len(gold)
    top3 = sum(any(x in g for x in r) for r, g in zip(ranked, gold)) / len(gold)
    print(f"  {name:<28} top-1 {top1:5.1%}   top-3 {top3:5.1%}")
    return top3


def q8(m: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Symmetric per-row int8 quantisation."""
    scale = np.abs(m).max(axis=1) / 127.0
    scale[scale == 0] = 1.0
    q = np.clip(np.round(m / scale[:, None]), -127, 127).astype(np.int8)
    return q, scale.astype(np.float32)


# -------------------------------------------------------------------- main --
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dims", type=int, default=192, help="Matryoshka truncation (64..1024)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--english", type=int, default=6000, help="most frequent English words to cover")
    ap.add_argument("--eval-only", action="store_true")
    args = ap.parse_args()

    data = json.loads((ROOT / "data" / "tools.json").read_text("utf-8"))
    tools, cats = data["tools"], {c["id"]: c for c in data["categories"]}
    evalset = json.loads((ROOT / "data" / "eval_queries.json").read_text("utf-8"))
    eq, gold = [e[0] for e in evalset], [e[1] for e in evalset]

    print(f"Downloading {MODEL_ID} from the Hugging Face Hub ...")
    tok_path = hf_hub_download(MODEL_ID, "0_StaticEmbedding/tokenizer.json")
    w_path = hf_hub_download(MODEL_ID, "0_StaticEmbedding/model.safetensors")
    tokenizer = Tokenizer.from_file(tok_path)
    weights = next(iter(load_file(w_path).values())).astype(np.float32)
    vocab = tokenizer.get_vocab()  # token -> id
    print(f"  vocab {len(vocab):,} tokens x {weights.shape[1]} dims")

    # 1) reference: full model
    print("Evaluating on", len(eq), "held-out Arabic requests:")
    evaluate("full model (1024d fp32)", rank(StaticModel(tokenizer, weights), tools, cats, eq), gold)

    # 2) pruned vocab + truncated + int8, with the browser's exact tokenisation
    kept = select_vocab(tokenizer, tools, args.english)
    small_tok = pruned_tokenizer(tokenizer, kept)
    sub = weights[[vocab[t] for t in kept], : args.dims]
    q, scale = q8(sub)
    deq = q.astype(np.float32) * scale[:, None]
    print(f"  pruned vocab {len(kept):,} tokens "
          f"({sum(all(is_arabic(c) for c in body(t)) for t in kept):,} Arabic)")
    for d in sorted({128, args.dims}):
        if d > args.dims:
            continue
        m = StaticModel(small_tok, deq[:, :d], offset=1)
        evaluate(f"browser model ({d}d int8)", rank(m, tools, cats, eq), gold)

    if args.eval_only:
        return

    # 3) export runtime files
    args.out.mkdir(parents=True, exist_ok=True)
    model = StaticModel(small_tok, deq, offset=1)
    (args.out / "vocab.txt").write_text("\n".join(kept) + "\n", "utf-8")
    with open(args.out / "model.bin", "wb") as f:
        f.write(b"TASE")  # magic: TechAlaraj Static Embeddings
        f.write(struct.pack("<II", len(kept), args.dims))
        f.write(scale.tobytes())
        f.write(q.tobytes())

    def pack(vecs: np.ndarray) -> list[str]:
        qv = np.clip(np.round(vecs * 127), -127, 127).astype(np.int8)
        return [base64.b64encode(v.tobytes()).decode() for v in qv]

    runtime_tools = []
    for t in tools:
        desc, ex = tool_documents(t, cats)
        runtime_tools.append({
            **{k: t[k] for k in ("id", "name", "cat", "url", "what", "use", "tip", "tipType")},
            "aliases": [t["name"].lower(), *[a.lower() for a in t.get("aliases", [])]],
            "desc": pack(model.encode([desc]))[0],
            "examples": pack(model.encode(ex)),
        })

    (args.out / "tools.json").write_text(json.dumps({
        "model": MODEL_ID,
        "dims": args.dims,
        "weights": {"example": W_EXAMPLE, "desc": W_DESC, "alias": ALIAS_BOOST},
        "categories": data["categories"],
        "tools": runtime_tools,
        # a few reference vectors so the JS port can be checked against Python
        "selftest": [{"text": s, "vec": pack(model.encode([s]))[0]} for s in eq[:4]],
    }, ensure_ascii=False, separators=(",", ":")), "utf-8")

    sizes = {p.name: p.stat().st_size for p in args.out.iterdir()}
    print("Wrote", ", ".join(f"{k} {v / 1024:,.0f} KB" for k, v in sorted(sizes.items())))

    # 4) parity fixture for the TypeScript tokenizer/ranker (apps/waitlist/tests)
    tricky = [
        "إعلانٌ فيديو سينمائيّ لمنتجي!", "ChatGPT's n8n workflow, 2026?", "بدّي‌ أعمل\tريلز…",
        "Café ٣٠ أداة «ذكاء» اصطناعي؛ صح؟", "中文 混合 text", "a" * 120, "ﻣﺤﻤﺪ اﻷﻋﺮج",
    ]
    fixture = {
        "tokens": [
            {"text": s, "ids": [i - 1 if i > 0 else -1 for i in e.ids]}
            for s, e in zip(eq + tricky, small_tok.encode_batch(eq + tricky, add_special_tokens=False))
        ],
        "ranking": [{"query": s, "top3": r} for s, r in zip(eq, rank(model, tools, cats, eq))],
        "gold": [{"query": s, "ids": g} for s, g in zip(eq, gold)],
    }
    fx = ROOT.parent / "apps" / "waitlist" / "tests" / "fixtures" / "tokenizer.json"
    fx.parent.mkdir(parents=True, exist_ok=True)
    fx.write_text(json.dumps(fixture, ensure_ascii=False, indent=1), "utf-8")
    print("Wrote", fx.relative_to(ROOT.parent))


if __name__ == "__main__":
    main()
