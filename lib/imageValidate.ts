/**
 * Server-side image MIME detection.
 *
 * Browsers let users set any `file.type` they want — uploading an HTML
 * page with `image/jpeg` is trivial. Once a file lands in our Supabase
 * Storage bucket, downstream code (Next/Image, the admin's <img> tag,
 * the Excel export embedder) trusts the bucket's stored content-type
 * implicitly. If we let mis-declared content through, an attacker can
 * smuggle a polyglot or active content past our extension allowlist.
 *
 * This helper sniffs the first few bytes of the upload and returns the
 * real MIME (one of the four we accept) or `null` for "definitely not
 * an image of that flavour". Call this on EVERY upload before handing
 * the buffer to Supabase.
 */

export type DetectedImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

export function detectImageMime(buf: Buffer | Uint8Array): DetectedImageMime | null {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (b.length < 12) return null;

  // JPEG — FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP — "RIFF" .... "WEBP"
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  // HEIC / HEIF — ISO BMFF "ftyp" box with brand heic|heix|mif1|msf1|hevc|hevx
  // Bytes 4-7 are "ftyp", 8-11 is brand.
  if (b.toString("ascii", 4, 8) === "ftyp") {
    const brand = b.toString("ascii", 8, 12);
    if (
      brand === "heic" ||
      brand === "heix" ||
      brand === "mif1" ||
      brand === "msf1" ||
      brand === "hevc" ||
      brand === "hevx"
    ) {
      return "image/heic";
    }
  }

  return null;
}

/**
 * Convenience: detect MIME on the provided buffer and verify it's in
 * the given allow-set, returning the canonical MIME on success.
 */
export function validateImageBuffer(
  buf: Buffer | Uint8Array,
  allowed: ReadonlyArray<DetectedImageMime>,
): DetectedImageMime | null {
  const mime = detectImageMime(buf);
  if (!mime) return null;
  return allowed.includes(mime) ? mime : null;
}
