# TechAlaraj AI waitlist (v2)

Static landing page for the AI course + community waitlist. It replaces the
Manus-hosted version (Express + tRPC + MySQL + Manus OAuth), which stopped
working outside Manus, with a stack that runs anywhere and costs nothing.

```
apps/waitlist/            this project (Vite 8, React 19, TypeScript, Tailwind 4)
  src/sections/           page sections (Hero, ToolFinder, Content)
  src/three/              3D scenes: three.js 0.187 + @react-three/fiber 9 + drei (+ postprocessing in the galaxy)
  src/ai/                 in-browser Hugging Face model (WordPiece tokenizer + static embeddings)
  public/ai/              model files built by ml/build_tool_index.py (~2.3 MB, lazy-loaded)
  public/img/*-depth.png  depth maps built by ml/depth_portrait.py
  tests/                  parity tests: TypeScript == Python/HF tokenizers
waitlist/                 production build (served by GitHub Pages) - do not edit by hand
supabase/                 SQL migrations + Edge Function source (deployed to project `wasla`)
ml/                       Python + Hugging Face asset pipeline
```

## Commands

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 49 tokenizer/embedding/ranking parity tests
pnpm build      # type-check + build into ../../waitlist
pnpm preview    # serve the build on :4173
```

## Backend (Supabase, project `wasla`)

The `wasla` project runs with the Data API switched off, so the browser never
talks to Postgres directly. Everything goes through one Edge Function:

`POST https://ienypzfqspjlmjbiujhy.supabase.co/functions/v1/techalaraj-waitlist`

| action | body | result |
| --- | --- | --- |
| `join` | `name, email, source?, tz?, website` (honeypot) | `{status: created \| duplicate \| invalid \| rate_limited}` |
| `admin_list` | `key` | `{ok, total, today, rows}` |
| `admin_delete` | `key, id` | `{ok}` |

- Data: private schema `techalaraj` (tables `signups`, `hits`, `admin`), RLS on, no grants to `anon`/`authenticated`.
- Emails are trimmed + lower-cased and unique; duplicates return `duplicate` (the page shows a soft success).
- Rate limits: 8 joins / 10 min per IP; 10 wrong admin keys / 15 min per IP.
- The admin key is stored only as a bcrypt hash. Rotate it in the Supabase SQL editor:

```sql
insert into techalaraj.admin (id, key_hash)
values (1, extensions.crypt('NEW-LONG-RANDOM-KEY', extensions.gen_salt('bf', 10)))
on conflict (id) do update set key_hash = excluded.key_hash, updated_at = now();
```

Traffic source: share links like `.../waitlist/?src=instagram`, `?src=bio`, `?src=story`
and the admin page groups signups by source.

## Performance & accessibility

- First paint = HTML + 93 KB gzip JS; fonts are self-hosted (IBM Plex Sans Arabic, Inter).
- The hero photo is always the original `<img>` (never deformed). A transparent WebGL layer
  (285 KB gzip, shared with the galaxy) loads when the browser is idle and adds tiles,
  particles and a light scan around it; Depth Anything's depth map is used only as an
  invisible occluder. A pixel test confirms the face region is identical with and without 3D. The tool-finder model loads only
  when its section approaches (not on Data Saver until used).
- Render loops pause off-screen; phones get fewer particles and no bloom.
- `prefers-reduced-motion`: no hero 3D layer, no auto-rotation, no reveal animations.
- No WebGL: static images; the tool finder still works as a list.
- Arabic error messages, `aria-invalid`/`aria-describedby`, live regions for results and
  the thank-you state, 54 px inputs with 16 px text (no iOS zoom).

## Moving to another domain

The build uses relative paths and works under any folder. Update the absolute
`og:url`, `og:image`, `twitter:image` and `canonical` in `index.html`, then rebuild.
