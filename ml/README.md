# ml/ — Python + Hugging Face pipeline for the waitlist page

Everything here runs **once, offline**, and writes small static files into
`apps/waitlist/public/`. Visitors never call an AI API: the page stays fast,
free to host, and private.

| Script | Hugging Face model | Output | What it powers |
| --- | --- | --- | --- |
| `build_tool_index.py` | [`sentence-transformers/static-similarity-mrl-multilingual-v1`](https://huggingface.co/sentence-transformers/static-similarity-mrl-multilingual-v1) (Apache-2.0) | `public/ai/model.bin` · `vocab.txt` · `tools.json` (~2.3 MB) | **AI tool finder** - type what you want to do in Arabic, get the right tool from the guide, computed in the browser |
| `depth_portrait.py` | [`depth-anything/Depth-Anything-V2-Small-hf`](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf) (Apache-2.0) | `public/img/*-depth.png` | **3D scene around the real photo** - invisible depth occluder so particles/tiles wrap around the body (the photo itself is never deformed) |
| `optimize_pdf.py` | – | `public/guide/*.pdf` | Lead-magnet PDF 7.8 MB → 2.8 MB, visually checked page by page |
| `export_signups.py` | – | `signups-YYYY-MM-DD.csv` | CSV + report by source / time zone / day (stdlib only) |

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r ml/requirements.txt
python ml/build_tool_index.py          # prints retrieval accuracy, writes public/ai/*
python ml/depth_portrait.py            # writes public/img/*-depth.png
python ml/optimize_pdf.py original.pdf apps/waitlist/public/guide/TechAlaraj_30_AI_Tools_Guide.pdf
TECHALARAJ_ADMIN_KEY=... python ml/export_signups.py
```

## Tool finder: how it works

1. `data/tools.json` holds the 30 tools of the guide (text copied from the PDF)
   plus a few example requests per tool in Levantine Arabic.
2. The static embedding model turns any text into a vector by averaging the
   vectors of its WordPiece tokens. We keep only Arabic tokens + the pieces of
   the 6,000 most common English words (11.5k of 105k tokens), cut the
   Matryoshka vectors to 192 dimensions and store them as int8.
3. In the browser (`apps/waitlist/src/ai/`) the same tokenizer and averaging
   run in plain TypeScript in a few milliseconds; the best tools are ranked by
   cosine similarity (best example request + description + name aliases).

Accuracy on `data/eval_queries.json` (34 held-out Arabic requests):

| | top-1 | top-3 |
| --- | --- | --- |
| full model (1024d, fp32, 434 MB) | 79.4% | 97.1% |
| browser model (192d, int8, 2.2 MB) | 82.4% | 97.1% |

Add a tool or improve matching: edit `data/tools.json`, re-run
`build_tool_index.py`, rebuild the site.

If downloads fail behind a proxy, set `HF_HUB_DISABLE_XET=1`.
