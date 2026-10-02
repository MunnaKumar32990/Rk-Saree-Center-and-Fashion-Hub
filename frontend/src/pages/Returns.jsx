import { Link } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiInfo } from "react-icons/fi";
import Seo, { faqSchema, breadcrumbSchema } from "../components/Seo";
import TrustBar from "../components/TrustBar";

/**
 * Returns — the policy written to be read, not to be found.
 *
 * Research is consistent that a clear, plain-language return policy printed near
 * the buy button reduces abandonment (an unclear or restrictive policy is a top
 * abandonment reason), and that long email/phone threads are exactly where
 * returns turn into complaints and one-star reviews.
 *
 * So this page: states the window and the reasons up front, says what makes a
 * piece non-returnable *before* the customer commits rather than after delivery,
 * commits to a refund timeline, and points at the self-serve flow.
 */

const FAQS = [
  {
    q: "How many days do I have to return an item?",
    a: "7 days from the delivery date. Raise it from your order page and we'll arrange a free reverse pickup from your address.",
  },
  {
    q: "What does a return cost me?",
    a: "Nothing. Reverse pickup is free, and the full amount is refunded. For Cash on Delivery orders there is nothing to refund because nothing was collected.",
  },
  {
    q: "When will I get my money back?",
    a: "We initiate the refund within 24 hours of receiving the item back. UPI refunds usually reach your account within a further 24 hours; card and net-banking refunds can take 5-7 working days to appear, depending on your bank.",
  },
  {
    q: "Why can't I return a saree after getting it stitched?",
    a: "Because it can no longer be resold. Once a blouse is stitched, or after fall, pico, edging or pre-draping is done, the piece is finished and unsellable. We state this clearly on every product page before you pay, and we recommend ordering unstitched for your first purchase.",
  },
  {
    q: "Can I exchange instead of returning?",
    a: "Yes — a different size or colour where stock allows. Message us on WhatsApp after placing your order and we'll reserve the replacement before your return arrives, so you don't lose the item.",
  },
];

const Section = ({ title, children, icon }) => (
  <section className="mb-8">
    <h2 className="font-outfit text-2xl font-bold text-stone-900 mb-3 flex items-center gap-2.5">
      <span aria-hidden="true" className="text-teal-700">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

const Returns = () => (
  <>
    <Seo
      title="Returns & Refund Policy"
      description="7-day free returns on sarees and ethnic wear. Refunds initiated within 24 hours of pickup, UPI refunds usually within a day. Cash on Delivery has no return cost."
      url="/returns"
      jsonLd={[
        faqSchema(FAQS),
        breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Returns", href: "/returns" }]),
      ]}
    />

    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link to="/" className="hover:text-stone-800">Home</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-stone-800">Returns &amp; Refunds</span>
      </nav>

      <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
        Returns &amp; refunds
      </h1>
      <p className="text-stone-600 text-lg mb-8">
        No fine print, no forms to chase. Here's exactly how it works.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        {[
          { label: "Return window", value: "7 days", note: "from delivery" },
          { label: "Reverse pickup", value: "Free", note: "arranged by us" },
          { label: "Refund initiated", value: "≤ 24 hrs", note: "after we receive it" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-teal-700 font-medium">{s.label}</p>
            <p className="font-outfit text-2xl font-bold text-teal-900 my-1">{s.value}</p>
            <p className="text-xs text-teal-800">{s.note}</p>
          </div>
        ))}
      </div>

      <Section title="What you can return" icon={<FiCheckCircle className="w-6 h-6" />}>
        <ul className="space-y-2.5 text-stone-700">
          {[
            "Wrong size — exchange or return for a refund",
            "Wrong item sent",
            "Damaged or defective — we'll ship a replacement immediately",
            "Not as described on the product page",
            "Colour differs noticeably from the photo",
            "Changed your mind",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <FiCheckCircle className="text-emerald-600 shrink-0 mt-1" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900 flex gap-2.5">
          <FiInfo className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Only part of an order?</strong> No problem. When you raise the
            return you can pick exactly which items you're sending back — you don't
            have to return the whole order.
          </p>
        </div>
      </Section>

      <Section title="What can't be returned" icon={<FiXCircle className="w-6 h-6" />}>
        <ul className="space-y-2.5 text-stone-700">
          {[
            "Sarees with a stitched blouse — the fabric has been cut and finished",
            "Anything with fall, pico or edging already attached",
            "Pre-draped or pleated sarees",
            "Items returned after 7 days from delivery",
            "Items returned without tags or with clear signs of wear",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <FiXCircle className="text-red-500 shrink-0 mt-1" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-stone-600">
          This isn't us being difficult — these items can't be resold, so a return
          would be a loss to us that we'd pass on to you as a return fee. We'd
          rather be straightforward about why.
        </p>
        <p className="mt-3 text-sm text-stone-700">
          <strong>Our recommendation:</strong> order your first piece unstitched, check
          the fabric and colour in daylight, then get it stitched. It costs you
          nothing and it removes almost every reason to return.
        </p>
      </Section>

      <Section title="How to raise a return" icon={<FiCheckCircle className="w-6 h-6" />}>
        <ol className="space-y-3 text-stone-700 list-decimal list-inside">
          <li>
            Open <Link to="/myorders" className="text-teal-800 underline font-medium">My Orders</Link>{" "}
            and find the order.
          </li>
          <li>Tap <strong>Request return</strong> and choose a reason. Add photos if something arrived damaged.</li>
          <li>We arrange a reverse pickup from your address, usually within 24 hours.</li>
          <li>Hand the parcel to the courier. We don't ask you to pay anything.</li>
          <li>We initiate the refund within 24 hours of the parcel reaching us.</li>
        </ol>
        <p className="mt-3 text-sm text-stone-600">
          Prefer to talk it through? WhatsApp us and we'll sort it in one go —{" "}
          <a
            href="https://wa.me/919708756854?text=Hi%20RK%20Saree%20Center%2C%20I%20have%20a%20question%20about%20a%20return%20or%20exchange"
            className="text-teal-800 underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            message us on WhatsApp
          </a>
          .
        </p>
      </Section>

      <Section title="Refund timelines" icon={<FiCheckCircle className="w-6 h-6" />}>
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm min-w-[480px]">
            <caption className="sr-only">Expected refund timelines by payment method</caption>
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="text-left p-3 font-semibold text-stone-900">You paid by</th>
                <th scope="col" className="text-left p-3 font-semibold text-stone-900">Refund reaches you in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[
                ["UPI", "usually within 24 hours of initiation"],
                ["Debit / credit card", "5-7 working days (set by your bank)"],
                ["Net banking", "5-7 working days"],
                ["Wallet", "within 24 hours"],
                ["Cash on Delivery", "nothing to refund — no payment was taken"],
              ].map(([method, timing]) => (
                <tr key={method}>
                  <td className="p-3 font-medium text-stone-900">{method}</td>
                  <td className="p-3 text-stone-700">{timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Questions" icon={<FiInfo className="w-6 h-6" />}>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-xl border border-stone-200 bg-white p-4 group">
              <summary className="font-semibold text-stone-900 cursor-pointer list-none flex justify-between gap-4 items-center min-h-[32px]">
                {f.q}
                <span aria-hidden="true" className="text-stone-400 group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <TrustBar className="mt-10" />
    </div>
  </>
);

export default Returns;