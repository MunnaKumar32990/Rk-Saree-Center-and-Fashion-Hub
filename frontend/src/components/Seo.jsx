/* eslint-disable react-refresh/only-export-components -- This module exports
   the <Seo> component together with the schema.org builders it is designed to
   be used with. The builders are pure and belong next to the component that
   consumes them, so splitting the file would not improve fast refresh. */
import { Helmet } from "react-helmet-async";

const SITE = import.meta.env.VITE_SITE_URL || "https://rk-saree-center-and-fashion-hub.vercel.app";
const DEFAULT_IMAGE = `${SITE}/og-image.png`;
const BRAND = "RK Saree Center & Fashion Hub";

/**
 * SEO — page title, meta description, canonical, Open Graph, Twitter card, and
 * JSON-LD structured data.
 *
 * The original app only set Helmet tags on about 10 of its ~30 routes, so most
 * pages shared whatever the last-rendered title was. Search-result titles,
 * descriptions and share previews were effectively random.
 *
 * The JSON-LD matters commercially. For ethnic wear, Google surfaces Product
 * rich results (star rating, price, availability) from structured data, and
 * shoppers search with very specific long-tail phrases — "banarasi silk saree
 * with blouse piece", "pink silk saree for wedding under 3000". A
 * machine-readable fabric/length/blouse-piece block is what lets those pages
 * qualify.
 */
const Seo = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noindex = false,
  nofollow = false,
  keywords,
  jsonLd,
  children,
}) => {
  const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} — Sarees & Ethnic Wear Online`;
  const canonical = url ? `${SITE}${url.startsWith("/") ? url : `/${url}`}` : SITE;
  const desc = (description || "").slice(0, 160);

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      {keywords && <meta name="keywords" content={keywords} />}

      <link rel="canonical" href={canonical} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && nofollow && <meta name="robots" content="index, nofollow" />}
      {!noindex && !nofollow && <meta name="robots" content="index, follow" />}

      {/* Open Graph — this is what WhatsApp and Facebook render */}
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title || BRAND} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || BRAND} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || BRAND} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}

      {children}
    </Helmet>
  );
};

// ── Structured data builders ────────────────────────────────────────────────

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: BRAND,
  url: SITE,
  logo: `${SITE}/logo.png`,
  image: DEFAULT_IMAGE,
  description:
    "Handpicked sarees, kurtis, lehengas and ethnic wear for women, men and kids. Free delivery over ₹2,000 and Cash on Delivery across India.",
  telephone: import.meta.env.VITE_BUSINESS_PHONE || "+91-97087-56854",
  email: import.meta.env.VITE_BUSINESS_EMAIL || "orders@example.com",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash on Delivery, UPI, Credit Card, Debit Card, Net Banking",
  areaServed: { "@type": "Country", name: "India" },
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  aggregateRating: undefined,
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "10:00",
    closes: "20:00",
  },
};

export const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.label,
    item: `${SITE}${item.href}`,
  })),
});

/**
 * Product schema.
 *
 * Includes the saree-specific attributes as additionalProperty entries, because
 * that is precisely the information a buyer is searching on and that a
 * marketplace listing never publishes.
 */
export const productSchema = (product) => {
  if (!product) return null;
  const price = Number(product.discountedPrice ?? product.price) || 0;
  const inStock = Number(product.countInStock) > 0 && !product.oversold;
  const s = product.specs || {};

  const properties = [
    ["Fabric", s.fabric],
    ["Weave", s.weave],
    ["Zari", s.zariType],
    ["Zari finish", s.zariFinish],
    ["Saree length", s.lengthMeters ? `${s.lengthMeters} m` : null],
    ["Saree width", s.widthInches ? `${s.widthInches} inches` : null],
    [
      "Blouse piece",
      s.blousePieceIncluded
        ? `Included (unstitched, ${s.blousePieceMeters ? `${s.blousePieceMeters} m` : "standard"})`
        : "Not included",
    ],
    ["Fall & pico", s.fallPicoProvided ? "Included" : "Not included"],
    ["Occasion", s.occasion],
    ["GI tag", s.giTag],
    ["Silk Mark", s.silkMark ? "Yes" : null],
    ["Care", s.washCare],
  ].filter(([, v]) => Boolean(v));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: String(product.description || product.name).slice(0, 500),
    image: (product.images?.length ? product.images : [product.image]).filter(Boolean).slice(0, 4),
    url: `${SITE}/product/${product._id}`,
    sku: product.sku || undefined,
    brand: { "@type": "Brand", name: product.brand || BRAND },
    ...(product.category && { category: product.category }),
    offers: {
      "@type": "Offer",
      url: `${SITE}/product/${product._id}`,
      priceCurrency: "INR",
      price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: BRAND },
    },
    ...(Number(product.numReviews) > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(product.rating) || 0,
        reviewCount: Number(product.numReviews) || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(properties.length > 0 && {
      additionalProperty: properties.map(([name, value]) => ({
        "@type": "PropertyValue",
        name,
        value: String(value),
      })),
    }),
  };
};

export const itemListSchema = (products) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  numberOfItems: products.length,
  itemListElement: products.slice(0, 24).map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE}/product/${p._id}`,
    name: p.name,
  })),
});

export const faqSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export default Seo;
export { SITE, BRAND };