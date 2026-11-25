/**
 * Registers the Thmanyah fonts packed into the bundle by build/thmanyah-fonts.ts.
 * The bytes are restored in memory and handed to the FontFace API; there is no
 * font file URL on the site (see the license note in that plugin).
 */
function unpack(data: string, key: string): ArrayBuffer {
  const bin = atob(data);
  const k = Uint8Array.from(atob(key), c => c.charCodeAt(0));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) ^ k[(i * 7 + 3) % 32];
  return out.buffer;
}

export async function loadThmanyah(): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  try {
    const { default: faces } = await import("virtual:thmanyah-fonts");
    if (!faces.length) return;
    await Promise.all(
      faces.map(async f => {
        const face = new FontFace(f.family, unpack(f.data, f.key), { weight: String(f.weight), display: "swap" });
        await face.load();
        document.fonts.add(face);
      }),
    );
    document.documentElement.classList.add("thmanyah");
  } catch {
    /* keep the fallback fonts */
  }
}
