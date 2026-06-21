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
 * Generates descriptive alt text for product images.
 * @param {object} product
 * @returns {string}
 */
export const productAlt = (product) => {
  if (!product) return "RK Saree & Fashion Hub product";
  const parts = [product.name, product.category, product.brand].filter(Boolean);
  return `${parts.join(" — ")} | RK Saree & Fashion Hub`;
};
