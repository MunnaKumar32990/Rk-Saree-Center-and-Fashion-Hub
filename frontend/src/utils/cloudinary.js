/**
 * cloudinary.js — Cloudinary image optimization utilities.
 * Call getOptimizedImageUrl() everywhere instead of using raw URLs directly.
 * This applies w_auto, f_auto, q_auto Cloudinary transforms automatically.
 */

/**
 * Returns an optimized Cloudinary URL with automatic format, quality, and width.
 * Works transparently for non-Cloudinary URLs (returns them unchanged).
 *
 * @param {string} url - Original image URL
 * @param {number} width - Target display width in pixels
 * @param {number} [quality=80] - Image quality 1-100 (default: auto)
 * @returns {string} Optimized URL
 */
export const getOptimizedImageUrl = (url, width = 400, quality = "auto") => {
  if (!url) return "";

  // Only transform Cloudinary URLs
  if (!url.includes("cloudinary.com")) return url;

  // Already has transformation params — don't double-transform
  if (url.includes("/upload/w_") || url.includes("/upload/f_")) return url;

  // Insert optimization transforms after /upload/
  const transforms = `w_${width},f_auto,q_${quality},c_limit`;
  return url.replace("/upload/", `/upload/${transforms}/`);
};

/**
 * Preset helpers for common use cases.
 */

/** Product card thumbnail — 400px wide */
export const cardImage = (url) => getOptimizedImageUrl(url, 400);

/** Product detail main image — 800px wide */
export const detailImage = (url) => getOptimizedImageUrl(url, 800);

/** Small thumbnail (cart, admin) — 150px wide */
export const thumbImage = (url) => getOptimizedImageUrl(url, 150);

/** Mobile-optimized banner — 800px wide */
export const bannerImage = (url) => getOptimizedImageUrl(url, 800, 75);

/**
 * productAlt — descriptive alt text.
 *
 * The original produced "Silk Saree — Women — RK Saree & Fashion Hub", which is
 * keyword-stuffed and describes nothing. Alt text should let a screen-reader
 * user (or a Google crawler) understand what is actually shown, so this
 * includes colour, fabric and weave where they're known — which is also exactly
 * what people search for.
 */
export const productAlt = (product) => {
  if (!product) return "Product photo from RK Saree Center & Fashion Hub";

  const s = product.specs || {};
  const bits = [product.name];

  const colour = [s.colourFamily, product.colors?.[0]].find(Boolean);
  if (colour) bits.push(colour);

  const material = s.fabric || (s.weave ? `${s.weave} fabric` : "");
  if (material) bits.push(material);

  const detail = [];
  if (s.blousePieceIncluded) {
    detail.push(
      s.blousePieceMeters
        ? `blouse piece included (${s.blousePieceMeters} m)`
        : "blouse piece included"
    );
  }
  if (s.lengthMeters) detail.push(`${s.lengthMeters} m long`);

  let alt = bits.filter(Boolean).join(", ");
  if (detail.length) alt += `, ${detail.join(", ")}`;

  return alt;
};

/** srcset widths for responsive images — lets phones fetch only what they need. */
export const responsiveSrcSet = (url, widths = [200, 400, 600, 800]) => {
  if (!url || !url.includes("cloudinary.com")) return undefined;
  return widths
    .map((w) => `${getOptimizedImageUrl(url, w)} ${w}w`)
    .join(", ");
};
