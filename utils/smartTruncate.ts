export function smartTruncate(
  input: string,
  max = 80,
  opts?: { preserveWords?: boolean; ellipsis?: string }
): { text: string; truncated: boolean } {
  const preserveWords = opts?.preserveWords ?? true;
  const ellipsis = opts?.ellipsis ?? "…";

  // Pecah ke code points agar emoji/aksara non-latin aman
  const chars = [...(input ?? "")];
  if (chars.length <= max) return { text: input, truncated: false };

  let sliced = chars.slice(0, Math.max(0, max)).join("");

  if (preserveWords) {
    // Potong di batas kata terdekat (jika ada spasi)
    const cut = sliced.replace(/\s+\S*$/, "");
    if (cut.length >= Math.floor(max * 0.6)) {
      sliced = cut;
    }
  }

  // Hindari hasil kosong kalau regex memotong terlalu banyak
  if (!sliced) sliced = chars.slice(0, Math.max(0, max)).join("");

  return { text: `${sliced}${ellipsis}`, truncated: true };
}
