/**
 * Faithful TypeScript port of the Hugging Face `tokenizers` pipeline used by
 * sentence-transformers/static-similarity-mrl-multilingual-v1:
 *   BertNormalizer(clean_text, handle_chinese_chars, strip_accents, lowercase)
 *   -> BertPreTokenizer (split on whitespace, isolate punctuation)
 *   -> WordPiece(unk="[UNK]", prefix="##", max_input_chars_per_word=100)
 * Parity with Python is checked in tests/finder.test.ts.
 */

const CONTROL = /\p{C}/u; // Cc Cf Cs Co Cn
const WHITESPACE = /\s/u;
const MARK_NONSPACING = /\p{Mn}/gu;
const UNICODE_PUNCT = /\p{P}/u;
const ASCII_PUNCT = /[!-/:-@[-`{-~]/;

function isChinese(cp: number): boolean {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df) ||
    (cp >= 0x2a700 && cp <= 0x2b73f) ||
    (cp >= 0x2b740 && cp <= 0x2b81f) ||
    (cp >= 0x2b920 && cp <= 0x2ceaf) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x2f800 && cp <= 0x2fa1f)
  );
}

export function normalize(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0 || cp === 0xfffd) continue;
    const ws = ch === "\t" || ch === "\n" || ch === "\r" || WHITESPACE.test(ch);
    if (!ws && CONTROL.test(ch)) continue;
    if (ws) out += " ";
    else if (isChinese(cp)) out += ` ${ch} `;
    else out += ch;
  }
  return out.normalize("NFD").replace(MARK_NONSPACING, "").toLowerCase();
}

function isPunct(ch: string): boolean {
  return ASCII_PUNCT.test(ch) || UNICODE_PUNCT.test(ch);
}

export function preTokenize(text: string): string[] {
  const words: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === " ") {
      if (cur) words.push(cur), (cur = "");
    } else if (isPunct(ch)) {
      if (cur) words.push(cur), (cur = "");
      words.push(ch);
    } else cur += ch;
  }
  if (cur) words.push(cur);
  return words;
}

export const UNK = -1;

/** Returns vocabulary row indices; unknown words yield UNK. */
export function wordPiece(word: string, vocab: Map<string, number>, maxChars = 100): number[] {
  const chars = Array.from(word);
  if (chars.length > maxChars) return [UNK];
  const ids: number[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = chars.length;
    let found = -1;
    while (start < end) {
      const piece = (start > 0 ? "##" : "") + chars.slice(start, end).join("");
      const id = vocab.get(piece);
      if (id !== undefined) {
        found = id;
        break;
      }
      end--;
    }
    if (found < 0) return [UNK];
    ids.push(found);
    start = end;
  }
  return ids;
}

export function tokenize(text: string, vocab: Map<string, number>): number[] {
  return preTokenize(normalize(text)).flatMap(w => wordPiece(w, vocab));
}
