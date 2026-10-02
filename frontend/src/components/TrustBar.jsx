import { Link } from "react-router-dom";

/**
 * TrustBar — the reassurance strip.
 *
 * Research on Indian e-commerce is unambiguous about which signals move the
 * needle, and it is not the usual Western badge wall:
 *
 *  - "COD Available — No Advance Payment" as an explicit label reduces
 *    abandonment most for first-time buyers, because COD functions as
 *    brand-backed security rather than a payment method.
 *  - Familiar logos beat generic "Secure Payment" seals; unrecognised trust
 *    badges (McAfee, TRUSTe) generate zero trust in India.
 *  - A stated refund/return timeline next to the CTA *increases* prepaid
 *    conversion rather than deterring it.
 *  - Three or four focused items outperform a wall of twelve — overuse reads
 *    as forced and backfires.
 *
 * So this is four specific, verifiable claims, not twelve vague ones.
 */
const ITEMS = [
  {
    key: "cod",
    icon: "💵",
    title: "Cash on Delivery",
    text: "Pay when it arrives. No advance payment.",
  },
  {
    key: "delivery",
    icon: "🚚",
    title: "Free delivery over ₹2,000",
    text: "4-6 days standard, 2-3 days express.",
  },
  {
    key: "returns",
    icon: "↩️",
    title: "7-day easy returns",
    text: "Free reverse pickup. Refund in 24h.",
  },
  {
    key: "secure",
    icon: "🔒",
    title: "UPI, cards & net banking",
    text: "Razorpay-secured payments.",
  },
];

const TrustBar = ({ variant = "default", className = "" }) => {
  const isCheckout = variant === "checkout";

  return (
    <section
      aria-label="Shopping guarantees"
      className={`${
        isCheckout
          ? "rounded-2xl border border-teal-200 bg-teal-50/70 p-4"
          : "border-y border-stone-200 bg-stone-50 py-6"
      } ${className}`}
    >
      <h2 className="sr-only">Shopping guarantees</h2>
      <ul
        className={`grid gap-x-4 gap-y-5 ${
          isCheckout ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4 px-4"
        }`}
      >
        {ITEMS.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="text-xl leading-none pt-0.5 shrink-0"
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 leading-snug">
                {item.title}
              </p>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                {item.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Payment marks: familiarity, not reputation, is what registers in India. */}
      {isCheckout && (
        <div className="mt-4 pt-4 border-t border-teal-200/70">
          <PaymentMarks />
        </div>
      )}
    </section>
  );
};

export const PaymentMarks = ({ className = "" }) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
    <span className="text-xs text-stone-600">We accept</span>
    <ul className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
      {[
        { name: "UPI", mark: "🟢" },
        { name: "Visa", mark: "💳" },
        { name: "Mastercard", mark: "🔵" },
        { name: "RuPay", mark: "🟠" },
        { name: "Net banking", mark: "🏦" },
        { name: "Wallets", mark: "📱" },
        { name: "Cash on Delivery", mark: "💵" },
      ].map((m) => (
        <li
          key={m.name}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-stone-200 text-xs font-medium text-stone-700"
        >
          <span aria-hidden="true">{m.mark}</span>
          {m.name}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * DeliveryPromise — a committed date window, not "ships in 2-5 days".
 *
 * Research is consistent that a vague delivery estimate is a top-three cause of
 * abandonment, and that giving an exact window roughly doubles conversion versus
 * a range. This shows a real, computed range from the purchase date, and states
 * the COD amount to keep ready — which measurably reduces failed deliveries.
 */
export const DeliveryPromise = ({ methodId = "standard", codAmount, className = "" }) => {
  const methods = {
    standard: { label: "Standard delivery", days: 5 },
    express: { label: "Express delivery", days: 3 },
  };
  const chosen = methods[methodId] || methods.standard;

  const addBusinessDays = (start, days) => {
    const d = new Date(start);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return d;
  };

  const from = addBusinessDays(new Date(), chosen.days - 1);
  const to = addBusinessDays(new Date(), chosen.days + 1);
  const fmt = (d) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div
      className={`rounded-xl border border-teal-200 bg-teal-50 p-4 ${className}`}
      role="status"
    >
      <p className="text-sm font-semibold text-teal-900 flex items-center gap-2">
        <span aria-hidden="true">📦</span>
        Arrives by {fmt(from)} – {fmt(to)}
      </p>
      <p className="text-xs text-teal-800 mt-1">
        {chosen.label}. We'll WhatsApp you tracking as soon as it ships.
      </p>
      {codAmount > 0 && (
        <p className="text-xs text-teal-800 mt-1.5 pt-1.5 border-t border-teal-200">
          Keep <strong>₹{codAmount.toLocaleString("en-IN")}</strong> ready in cash for the delivery agent.
        </p>
      )}
    </div>
  );
};

/**
 * CodBadge — surfaced on the product page, not just in checkout.
 *
 * "Adding a COD badge on the product page (not just in checkout) can reduce
 * bounce from the product page." For a first-time shopper this is often the
 * reason the PDP felt safe enough to buy.
 */
export const CodBadge = ({ compact = false, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold ${
      compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
    } ${className}`}
  >
    <span aria-hidden="true">💵</span>
    Cash on Delivery available
  </span>
);

/**
 * StockUrgency — honest scarcity.
 *
 * Deliberately restrained: only renders when stock is genuinely low, and never
 * invents a countdown. Fabricating scarcity ("4 people are viewing this!") is
 * corrosive for a business that also wants repeat customers, and Indian
 * shoppers distrust exactly the kind of pressure tactic they see on classifieds.
 */
export const StockUrgency = ({ product, className = "" }) => {
  const stock = Number(product?.countInStock) || 0;
  const threshold = Number(product?.lowStockThreshold) || 3;
  const oversold = product?.oversold;

  if (oversold || stock <= 0) {
    return (
      <p className={`text-sm font-semibold text-stone-700 flex items-center gap-1.5 ${className}`}>
        <span aria-hidden="true">⛔</span>
        Currently out of stock — restock alert available below
      </p>
    );
  }

  if (stock <= threshold) {
    return (
      <p
        className={`text-sm font-semibold text-amber-800 flex items-center gap-1.5 ${className}`}
        role="status"
      >
        <span aria-hidden="true">⚡</span>
        Only {stock} left{product?.subcategory === "Sarees" ? " — handloom pieces are often one-of-a-kind" : ""}
      </p>
    );
  }

  return (
    <p className={`text-sm text-emerald-800 flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true">✓</span>
      In stock
    </p>
  );
};

/**
 * ReturnPolicySummary — the essentials, on the product page.
 *
 * The policy should be readable where the decision is made, not hidden behind a
 * link to a PDF. This keeps the four points a buyer actually weighs up.
 */
export const ReturnPolicySummary = ({ className = "" }) => (
  <div className={`text-sm text-stone-700 ${className}`}>
    <h3 className="font-semibold text-stone-900 mb-2">Returns &amp; refunds</h3>
    <ul className="space-y-1.5">
      {[
        "7 days from delivery, for any reason",
        "Free reverse pickup from your door",
        "Refund initiated within 24 hours of pickup",
        "UPI refunds usually reach you within 24 hours",
      ].map((line) => (
        <li key={line} className="flex gap-2">
          <span aria-hidden="true" className="text-emerald-700">✓</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-xs text-stone-600">
      Not returnable once a blouse is stitched, or after fall, pico, edging or
      pre-draping is done — we'll say so clearly before you pay.{" "}
      <Link to="/returns" className="text-teal-800 underline hover:text-teal-900">
        Read the full policy
      </Link>
      .
    </p>
  </div>
);

export default TrustBar;