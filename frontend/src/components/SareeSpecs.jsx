/* eslint-disable react-refresh/only-export-components -- The sizing helpers
   (recommendedLength / blousePieceAdvice) are pure functions that only exist to
   feed <SareeSpecs>; co-locating them is intentional. */
/**
 * SareeSpecs — the component that turns a saree listing into an informed
 * purchase instead of a gamble.
 *
 * WHY THIS EXISTS
 *
 * 40-53% of apparel returns are driven by an information failure rather than an
 * operational failure, and ethnic wear has the worst RTO of any category
 * (30-45%). The questions a saree buyer asks *before* paying are consistent:
 * fabric composition, weaving method, zari type, exact length and width,
 * whether a blouse piece is included and how long it is, and whether the
 * colour matches the photo. Marketplaces answer almost none of them — which is
 * exactly why answering them here is a genuine competitive advantage rather
 * than table stakes.
 *
 * The blouse-piece row in particular resolves the single most common
 * misunderstanding in this category: 0.8 m comfortably makes a short- or
 * elbow-sleeve blouse but will NOT reliably yield full-length sleeves, a
 * princess-cut back, or a deep neckline. Buyers who don't know this blame the
 * seller. Stating it up front prevents both the return and the bad review.
 */

const Row = ({ label, value, hint }) => {
  if (value === null || value === undefined || value === "" || value === false) return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-stone-100 last:border-0">
      <dt className="text-sm text-stone-600 font-medium">{label}</dt>
      <dd className="col-span-2 text-sm text-stone-900">
        {value}
        {hint && <span className="block text-xs text-stone-500 mt-0.5">{hint}</span>}
      </dd>
    </div>
  );
};

/**
 * Recommended saree length by height.
 *
 * Length and width — not "size" — are the fit question for a saree, because the
 * body is essentially free-size. Wider fabric drapes higher on the body, which is
 * why a taller wearer usually wants the wider end of the 44-48" range.
 */
export function recommendedLength(heightCm) {
  const h = Number(heightCm);
  if (!Number.isFinite(h) || h <= 0) return null;
  if (h < 150) return { meters: 5.5, note: "Petite height — a shorter length drapes cleanly without bunching." };
  if (h < 165) return { meters: 6.0, note: "Standard fit for most heights." };
  if (h < 175) return { meters: 6.2, note: "Choose a wider panel (46\"+) for better drape." };
  return { meters: 6.5, note: "Tall height — 6.5 m including blouse piece gives the best fall." };
}

export function blousePieceAdvice(included, meters) {
  if (!included) {
    return {
      tone: "warn",
      text: "This saree does not include a blouse piece. Budget ₹300-600 at your local tailor — and note that fabric bought separately rarely matches a handloom dye lot under home lighting.",
    };
  }
  const m = Number(meters) || 0.8;
  if (m >= 1.0) {
    return {
      tone: "ok",
      text: `Includes an unstitched blouse piece of about ${m} m — enough for full sleeves, a deep neckline or a larger size.`,
    };
  }
  return {
    tone: "info",
    text: `Includes an unstitched blouse piece of about ${m} m. That comfortably makes a short- or elbow-sleeve blouse, but not full-length sleeves or a deep neckline — for those, ask us to send extra fabric.`,
  };
}

const SareeSpecs = ({ product, className = "" }) => {
  const s = product?.specs || {};
  const isSaree = product?.subcategory === "Sarees";

  const blouse = blousePieceAdvice(s.blousePieceIncluded, s.blousePieceMeters);

  const rows = [
    <Row key="fabric" label="Fabric" value={s.fabric} />,
    <Row key="composition" label="Composition" value={s.fabricComposition} />,
    <Row key="weave" label="Weave" value={s.weave} />,
    <Row
      key="zari"
      label="Zari"
      value={
        [s.zariType, s.zariFinish].filter(Boolean).join(" · ") ||
        (isSaree ? "Not specified — ask us for details" : "")
      }
    />,
    <Row
      key="length"
      label="Length"
      value={s.lengthMeters ? `${s.lengthMeters} m${
        s.blousePieceIncluded && s.blousePieceMeters
          ? ` (includes ${s.blousePieceMeters} m blouse piece)`
          : ""
      }` : ""}
    />,
    <Row
      key="width"
      label="Width"
      value={s.widthInches ? `${s.widthInches} inches` : ""}
      hint="Wider panels drape higher and look better on taller frames."
    />,
    <Row key="occasion" label="Best for" value={s.occasion} />,
    <Row key="care" label="Care" value={s.washCare} />,
  ].filter(Boolean);

  if (rows.length === 0 && !blouse) return null;

  return (
    <section className={className} aria-labelledby="specs-heading">
      <h2
        id="specs-heading"
        className="text-lg font-semibold text-stone-900 mb-1"
      >
        Fabric &amp; measurements
      </h2>
      <p className="text-xs text-stone-600 mb-3">
        Every detail a saree buyer asks about — stated up front, so you know
        exactly what arrives.
      </p>

      <dl className="border-t border-stone-200">{rows}</dl>

      {/* Blouse piece — the most misunderstood attribute in this category */}
      {s.blousePieceIncluded !== undefined && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            blouse.tone === "warn"
              ? "border-amber-300 bg-amber-50"
              : blouse.tone === "ok"
                ? "border-emerald-300 bg-emerald-50"
                : "border-sky-300 bg-sky-50"
          }`}
        >
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span aria-hidden="true">
              {blouse.tone === "warn" ? "⚠️" : blouse.tone === "ok" ? "✓" : "ℹ️"}
            </span>
            Blouse piece: {s.blousePieceIncluded ? "included" : "not included"}
            {s.blousePieceIncluded && s.blousePieceAttached ? " (attached, unstitched)" : ""}
          </h3>
          <p className="text-xs text-stone-700 mt-1.5 leading-relaxed">{blouse.text}</p>
          {s.blousePieceIncluded && (
            <p className="text-xs text-stone-600 mt-2 pt-2 border-t border-black/5">
              Tip: have your tailor cut the border motif at the hem so it sits on the
              back of the blouse, and use plain cotton lining — metallic zari
              abrades skin over a long event and snags on jewellery.
            </p>
          )}
        </div>
      )}

      {/* Authenticity — the government-issued proof points, not marketing claims */}
      {(s.giTag || s.silkMark || s.hsnCode) && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-sm font-semibold text-stone-900">Authenticity</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-stone-700">
            {s.giTag && (
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-700">✓</span>
                <span>
                  <strong>GI tagged</strong> — {s.giTag}. A Geographical Indication is
                  government-issued and cannot be self-declared by a seller.
                </span>
              </li>
            )}
            {s.silkMark && (
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-700">✓</span>
                <span>
                  <strong>Silk Mark certified</strong> — a hologram with a unique serial
                  and QR that you can verify at silkmarkindia.com. This is 100% natural
                  silk, not a blend or art silk.
                </span>
              </li>
            )}
            {s.hsnCode && (
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-emerald-700">✓</span>
                <span>
                  <strong>HSN {s.hsnCode}</strong> on your invoice — legally confirms the
                  fabric classification as pure silk.
                </span>
              </li>
            )}
          </ul>
          {s.weave === "Handloom" && (
            <p className="mt-3 pt-2 border-t border-stone-200 text-xs text-stone-600">
              Handloom pieces vary slightly in texture and shade from one piece to the
              next. That's the weave showing through — not a defect, and something we
              tell every customer before they order.
            </p>
          )}
        </div>
      )}

      {s.fallPicoProvided && (
        <p className="mt-3 text-xs text-stone-600">
          Fall and pico are ready-made and attached — ask your tailor to use them
          directly.
        </p>
      )}
    </section>
  );
};

export default SareeSpecs;