/**
 * e2e-body-3.mjs — catalogue behaviour and reviews.
 */

import { api, check, rule, restock } from "./e2e-context.mjs";
import { orderBody } from "./e2e-body-1.mjs";

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("11. CATALOGUE  (sorting, search, validation)");
  // ═══════════════════════════════════════════════════════════════════════════

  await ctx.Product.create([
    { name: "ZZ Cheap Kurti", image: "x.jpg", category: "Women", subcategory: "Kurtis",
      description: "d", price: 1000, countInStock: 5 },
    { name: "AA Mid Kurti", image: "x.jpg", category: "Women", subcategory: "Kurtis",
      description: "d", price: 2000, discount: 50, countInStock: 5 },
  ]);

  const asc = await api("/api/products?sort=price_asc&subcategory=Kurtis");
  check("price sort returns results", asc.data?.products?.length >= 2,
    `got ${asc.data?.products?.length}`);

  // Original bug: sort ran on raw `price` while the UI showed the DISCOUNTED
  // price, so "low to high" looked visibly wrong whenever a discount existed.
  const sorted = asc.data.products.map((p) => p.discountedPriceEffective);
  const isAscending = sorted.every((v, i) => i === 0 || v >= sorted[i - 1]);
  check("price ascending sorts by the DISPLAYED price", isAscending, JSON.stringify(sorted));

  const faceted = await api("/api/products/facets");
  check("facets returns categories", faceted.data?.categories?.length > 0);
  check("facets returns a price range", typeof faceted.data?.priceRange?.max === "number");
  check("facets returns subcategories", faceted.data?.subcategories?.length > 0);

  const byName = await api("/api/products?keyword=Banarasi");
  check("keyword search matches the product name", byName.data?.products?.length >= 1,
    `got ${byName.data?.products?.length}`);

  // ReDoS: an unescaped regex from a query string used to reach MongoDB.
  const redos = await api(`/api/products?keyword=${encodeURIComponent("(a+)+$")}`);
  check("a catastrophic-backtracking regex does not hang the request",
    redos.status === 200, `got ${redos.status}`);

  const badCategory = await api(`/api/products?category=${encodeURIComponent("Sarees")}`);
  check("an invalid category enum is rejected rather than silently ignored",
    badCategory.status === 400, `got ${badCategory.status}`);

  const mismatch = await api("/api/products", {
    method: "POST", token: ctx.admToken,
    body: { name: "Bad", image: "x.jpg", category: "Kids", subcategory: "Sherwani",
            description: "d", price: 100, countInStock: 1 },
  });
  check("Kids + Sherwani is rejected with a clear message",
    mismatch.status === 400 && /Sherwani/i.test(mismatch.data?.message || ""),
    `got ${mismatch.status} ${mismatch.data?.message}`);

  const noLength = await api("/api/products", {
    method: "POST", token: ctx.admToken,
    body: { name: "Saree no length", image: "x.jpg", category: "Women", subcategory: "Sarees",
            description: "d", price: 100, countInStock: 1 },
  });
  check("a saree without a stated length is rejected", noLength.status === 400,
    `got ${noLength.status}`);

  const goodSaree = await api("/api/products", {
    method: "POST", token: ctx.admToken,
    body: {
      name: "Test Handloom Saree", image: "x.jpg", category: "Women", subcategory: "Sarees",
      description: "Handloom cotton saree.", price: 3000, countInStock: 4,
      sku: "TEST-SKU-001", tags: ["cotton", "festive"],
      specs: {
        fabric: "Handloom Cotton", weave: "Handloom", lengthMeters: 6.3,
        widthInches: 46, blousePieceIncluded: true, blousePieceMeters: 0.8,
        occasion: "Festive",
      },
    },
  });
  check("a fully-specified saree is accepted", goodSaree.status === 201,
    `got ${goodSaree.status} ${goodSaree.text?.slice(0, 130)}`);
  check("sku is persisted (was silently dropped before)",
    goodSaree.data?.sku === "TEST-SKU-001", `got ${goodSaree.data?.sku}`);
  check("specs are persisted", goodSaree.data?.specs?.lengthMeters === 6.3);
  check("tags are persisted", (goodSaree.data?.tags || []).includes("cotton"));

  const edit = await api(`/api/products/${goodSaree.data._id}`, {
    method: "PUT", token: ctx.admToken, body: { sku: "TEST-SKU-002", tags: ["cotton", "new"] },
  });
  check("sku and tags can be edited (both were dropped before)",
    edit.data?.sku === "TEST-SKU-002" && edit.data?.tags.includes("new"),
    `sku=${edit.data?.sku} tags=${edit.data?.tags}`);

  const noSku = await api("/api/products", {
    method: "POST", token: ctx.admToken,
    body: { name: "No SKU kurti", image: "x.jpg", category: "Women", subcategory: "Kurtis",
            description: "d", price: 100, countInStock: 1 },
  });
  check("a product with no SKU still saves", noSku.status === 201, `got ${noSku.status}`);

  // Deleting a product that a live order references must be refused.
  const withOrder = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.scarce._id), qty: 1 }]),
  });
  if (withOrder.status === 201) {
    const del = await api(`/api/products/${ctx.scarce._id}`, { method: "DELETE", token: ctx.admToken });
    check("a product in a live order cannot be deleted (would orphan it)",
      del.status === 409, `got ${del.status} ${del.data?.message}`);
  }

  const delSku = await api(`/api/products/${goodSaree.data._id}`, { method: "DELETE", token: ctx.admToken });
  check("an unreferenced product can be deleted", delSku.status === 200, `got ${delSku.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.discountItem, 20);
  rule("12. REVIEWS  (verified purchase + aggregates)");
  // ═══════════════════════════════════════════════════════════════════════════
  const order = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.discountItem._id), qty: 1 }]),
  });
  for (const s of ["Packed", "Shipped", "Out for Delivery"]) {
    await api(`/api/orders/${order.data._id}/status`, { method: "PUT", token: ctx.admToken, body: { status: s } });
  }
  await api(`/api/orders/${order.data._id}/deliver`, { method: "PUT", token: ctx.admToken });

  const review = await api(`/api/products/${ctx.discountItem._id}/reviews`, {
    method: "POST", token: ctx.vicToken,
    body: { rating: 4, comment: "Beautiful drape, colour matches the photo in daylight.",
            fitFeedback: "True to Size" },
  });
  check("a delivered customer can review", review.status === 201,
    `got ${review.status} ${review.text?.slice(0, 100)}`);
  check("rating is aggregated correctly", review.data?.rating === 4, `got ${review.data?.rating}`);
  check("review count is 1", review.data?.numReviews === 1, `got ${review.data?.numReviews}`);

  const pdp = await api(`/api/products/${ctx.discountItem._id}`);
  check("the review is flagged as a verified purchase",
    pdp.data?.reviews?.[0]?.isVerifiedPurchase === true);
  check("fit feedback is stored (return-preventing data)",
    pdp.data?.reviews?.[0]?.fitFeedback === "True to Size");
  check("the star breakdown is maintained",
    pdp.data?.ratingBreakdown?.["4"] === 1, JSON.stringify(pdp.data?.ratingBreakdown));
  check("the fit summary is aggregated", pdp.data?.reviewCountByFit?.["True to Size"] === 1,
    JSON.stringify(pdp.data?.reviewCountByFit));

  const dupe = await api(`/api/products/${ctx.discountItem._id}/reviews`, {
    method: "POST", token: ctx.vicToken, body: { rating: 5, comment: "Trying again" },
  });
  check("a duplicate review is refused", dupe.status === 400, `got ${dupe.status}`);

  const badRating = await api(`/api/products/${ctx.discountItem._id}/reviews`, {
    method: "POST", token: ctx.admToken, body: { rating: 9, comment: "out of range" },
  });
  check("an out-of-range rating is refused", badRating.status === 400, `got ${badRating.status}`);

  const tooShort = await api(`/api/products/${ctx.discountItem._id}/reviews`, {
    method: "POST", token: ctx.admToken, body: { rating: 3, comment: "x" },
  });
  check("a one-character review is refused", tooShort.status === 400, `got ${tooShort.status}`);

  // Listing a product must not ship the whole review array.
  const list = await api("/api/products?limit=5");
  check("product listings omit the reviews array",
    (list.data?.products || []).every((p) => p.reviews === undefined));
}
