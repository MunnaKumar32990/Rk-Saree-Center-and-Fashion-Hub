import { useState } from "react";
import { Link } from "react-router-dom";
import { FiMaximize2, FiInfo, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import Seo, { faqSchema, breadcrumbSchema } from "../components/Seo";
import TrustBar from "../components/TrustBar";
import { recommendedLength } from "../components/SareeSpecs";

/**
 * SizeGuide — a fit tool, not a chart.
 *
 * "Free size" is the single most misleading convention in Indian ethnic wear.
 * There is no shared sizing logic: one label's medium is another's large, and
 * "free size" is printed to mean anything from S to 2XL. A static S/M/L chart
 * therefore cannot be trusted, and research consistently finds that sizing is
 * the largest driver of apparel returns.
 *
 * For sarees the honest answer is that the body is free-size and the real fit
 * questions are length, width and blouse sizing — which is what this tool
 * actually helps with.
 */

const FAQS = [
  {
    q: "What size should I order for a saree?",
    a: "A saree body is essentially free size — there is no S/M/L. What you choose instead is how much fabric to order: the total length, and the width of the panel. Taller wearers generally want 6.2-6.5 m and a wider panel (46 inches or more), because wider fabric drapes higher on the body and looks better.",
  },
  {
    q: "Is the blouse piece included?",
    a: "It depends on the piece, and every product page states it explicitly. When included it is unstitched fabric from the same loom run and dye lot as the saree, which matters: fabric bought separately almost never matches a handloom dye lot under warm indoor light.",
  },
  {
    q: "How much blouse fabric do I need?",
    a: "About 0.8 m comfortably makes a short- or elbow-sleeve blouse in most sizes. It will not reliably yield full-length sleeves, a princess-cut long back, a deep neckline, or a larger size with a deep hem — those need 1.0 to 1.25 m. Ask us for extra fabric if you need more.",
  },
  {
    q: "How do I know the colour will match?",
    a: "Our photos are taken in natural daylight, and screen brightness varies between devices — so a small difference is normal and we say so on every listing. If you need to see the exact piece before buying, message us on WhatsApp and we'll send you a daylight photo of the actual fabric.",
  },
  {
    q: "Can I return a saree after having it stitched?",
    a: "No. Once a blouse is stitched, or after fall, pico, edging or pre-draping is done, the piece is no longer resellable and cannot be returned or exchanged. This is stated clearly on each product page before you pay.",
  },
];

const BLUSICE_TABLE = [
  { metres: "0.8 m", makes: "Short- or elbow-sleeve blouse in most sizes", cannot: "Full sleeves, deep neckline, large sizes with deep hems" },
  { metres: "1.0 m", makes: "Full sleeves, princess-cut back, most necklines", cannot: "Layered or heavily embroidered designs" },
  { metres: "1.25 m", makes: "Anything above, including layered styles", cannot: "— (nothing to note)" },
];

const HeightInput = () => {
  const [cm, setCm] = useState("");
  const [imperial, setImperial] = useState(false);
  const numeric = Number(cm);
  const rec = recommendedLength(numeric);

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <h3 className="font-outfit text-lg font-semibold text-stone-900 flex items-center gap-2 mb-1">
        <FiMaximize2 className="w-5 h-5 text-teal-700" aria-hidden="true" />
        Find your saree length
      </h3>
      <p className="text-sm text-stone-600 mb-4">
        Height determines the drape. Enter yours and we'll recommend a total length.
      </p>

      <label htmlFor="height-input" className="block text-sm font-medium text-stone-800 mb-1.5">
        Your height
      </label>
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            id="height-input"
            type="number"
            inputMode="numeric"
            min={90}
            max={220}
            value={cm}
            onChange={(e) => setCm(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={imperial ? "e.g. 66" : "e.g. 162"}
            className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[48px]"
          />
          <p className="text-xs text-stone-500 mt-1">
            {imperial ? "in inches" : "in centimetres"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImperial((v) => !v)}
          className="px-4 rounded-xl border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50 min-h-[48px] whitespace-nowrap focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          aria-pressed={imperial}
        >
          {imperial ? "cm" : "inches"}
        </button>
      </div>

      {rec && (
        <div className="mt-4 rounded-xl bg-white border border-teal-200 p-4" role="status">
          <p className="text-sm font-semibold text-teal-900">
            We recommend {imperial ? `${Math.round(rec.meters * 39.37)} inches (${rec.meters} m)` : `${rec.meters} metres`} total
          </p>
          <p className="text-sm text-stone-600 mt-1">{rec.note}</p>
        </div>
      )}

      <p className="text-xs text-stone-500 mt-4">
        Still unsure? Message us on WhatsApp with your height and we'll suggest a
        specific piece from the catalogue.
      </p>
    </div>
  );
};

const SizeGuide = () => (
  <>
    <Seo
      title="Saree Size Guide — Length, Width & Blouse Fabric"
      description="Free saree size guide: find the right length for your height, how much blouse fabric you need, and what to check before ordering a saree online."
      url="/size-guide"
      jsonLd={[faqSchema(FAQS), breadcrumbSchema([{ label: "Home", href: "/" }, { label: "Size Guide", href: "/size-guide" }])]}
    />

    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link to="/" className="hover:text-stone-800">Home</Link>
        <span aria-hidden="true"> / </span>
        <span className="text-stone-800">Size Guide</span>
      </nav>

      <h1 className="font-outfit text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
        Saree size guide
      </h1>
      <p className="text-stone-600 text-lg mb-8 max-w-2xl">
        A saree body has no size — what varies is how much fabric you order and how
        wide the panel is. This guide tells you exactly what to look for, so nothing
        comes back.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <HeightInput />

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="font-outfit text-lg font-semibold text-stone-900 flex items-center gap-2 mb-3">
            <FiInfo className="w-5 h-5 text-teal-700" aria-hidden="true" />
            What to check before you pay
          </h3>
          <ol className="space-y-2.5 text-sm text-stone-700 list-decimal list-inside">
            {[
              "Fabric composition — is it 100% silk, or a blend?",
              "Weave — handloom, powerloom, or machine.",
              "Zari type — tested silk zari or artificial/metallic film.",
              "Total length and width in metres and inches.",
              "Whether a blouse piece is included, how long it is, and attached or separate.",
              "Weave variation — handloom pieces differ slightly in texture and shade.",
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="text-xs text-stone-500 mt-4 pt-3 border-t border-stone-100">
            Every product page on our store lists all six. If one is missing, ask us —
            we'll photograph the actual piece for you on WhatsApp.
          </p>
        </div>
      </div>

      {/* Blouse fabric table — the practical part people get wrong */}
      <section className="mb-10">
        <h2 className="font-outfit text-2xl font-bold text-stone-900 mb-2">
          How much blouse fabric do you need?
        </h2>
        <p className="text-stone-600 mb-4">
          This is where most blouse disappointments come from. 0.8 m is enough for a
          simple blouse — but not for full sleeves or a deep neckline.
        </p>
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm min-w-[560px]">
            <caption className="sr-only">
              Blouse fabric requirements by quantity
            </caption>
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="text-left p-3 font-semibold text-stone-900">Quantity</th>
                <th scope="col" className="text-left p-3 font-semibold text-stone-900">Enough for</th>
                <th scope="col" className="text-left p-3 font-semibold text-stone-900">Not enough for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {BLUSICE_TABLE.map((row) => (
                <tr key={row.metres}>
                  <td className="p-3 font-medium text-stone-900 whitespace-nowrap">{row.metres}</td>
                  <td className="p-3 text-stone-700">
                    <span className="flex gap-1.5">
                      <FiCheckCircle className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      {row.makes}
                    </span>
                  </td>
                  <td className="p-3 text-stone-700">
                    {row.cannot === "— (nothing to note)" ? (
                      <span className="text-stone-400">{row.cannot}</span>
                    ) : (
                      <span className="flex gap-1.5">
                        <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        {row.cannot}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Height → length reference */}
      <section className="mb-10">
        <h2 className="font-outfit text-2xl font-bold text-stone-900 mb-4">
          Saree length by height
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { range: "Under 150 cm", len: "5.5 m", note: "Petite height" },
            { range: "150 – 165 cm", len: "6.0 m", note: "Standard" },
            { range: "165 – 175 cm", len: "6.2 m", note: "Wider panel (46\"+)" },
            { range: "Above 175 cm", len: "6.5 m", note: "Best fall" },
          ].map((r) => (
            <div key={r.range} className="rounded-xl border border-stone-200 p-4 bg-white">
              <p className="text-xs text-stone-500">{r.range}</p>
              <p className="font-outfit text-xl font-bold text-teal-800 my-1">{r.len}</p>
              <p className="text-xs text-stone-600">{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-outfit text-2xl font-bold text-stone-900 mb-4">
          Common questions
        </h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-xl border border-stone-200 bg-white p-4 group">
              <summary className="font-semibold text-stone-900 cursor-pointer list-none flex justify-between gap-4 min-h-[32px] items-center">
                {f.q}
                <span aria-hidden="true" className="text-stone-400 group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <TrustBar />
    </div>
  </>
);

export default SizeGuide;