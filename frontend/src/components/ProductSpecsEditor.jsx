import { useState } from "react";
import { FiInfo, FiCheck, FiAlertCircle } from "react-icons/fi";

/**
 * ProductSpecsEditor — the admin form for saree/ethnic-wear specifications.
 *
 * Why this exists in the admin UI at all
 *
 * This is the single highest-leverage form in the whole product system. Every
 * field here answers a question ethnic-wear buyers ask *before* paying, and
 * 40-53% of apparel returns come from the information gap rather than from a
 * logistics failure. The storefront cannot publish what it has not captured.
 *
 * The specific pain points it prevents:
 *  - "Blouse piece not included" discovered after delivery — 0.8 m vs 1.0 m is
 *    the difference between a sleeve you can make and one you can't.
 *  - "Colour totally different from the photo" — stated weave and daylight
 *    photography expectations up front.
 *  - "Too short for my height" — length is the only fit question a saree has.
 *  - "Is this real silk?" — GI tag / Silk Mark / HSN 5007 are the government
 *    proof points, and they are checkable by the buyer.
 *
 * The form is deliberately opinionated: it asks for a saree length whenever the
 * subcategory is Sarees, because the schema enforces that too.
 */

const BLUSH = "#dc4899";

const Field = ({ label, hint, error, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
        <FiAlertCircle className="w-3 h-3" aria-hidden="true" />
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    ) : null}
  </div>
);

const textInput =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]";

const BoolToggle = ({ checked, onChange, id, label, description }) => (
  <label
    htmlFor={id}
    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 accent-primary-600 shrink-0"
    />
    <span className="min-w-0">
      <span className="block text-sm font-medium text-gray-800">{label}</span>
      {description && (
        <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
      )}
    </span>
  </label>
);

const SECTION_STYLES = `
  @keyframes rk-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .rk-fieldset-anim { animation: rk-fade-in .2s ease-out; }
`;

const ProductSpecsEditor = ({ subcategory, value, onChange, errors = {} }) => {
  const [open, setOpen] = useState(Boolean(value?.fabric || value?.lengthMeters));

  const s = value || {};
  const isSaree = subcategory === "Sarees";
  const set = (key) => (e) => {
    const v = e?.target ? e.target.value : e;
    onChange({ ...s, [key]: v });
  };
  const setNum = (key) => (e) => {
    const raw = e.target.value;
    onChange({ ...s, [key]: raw === "" ? null : Number(raw) });
  };
  const setBool = (key) => (v) => onChange({ ...s, [key]: v });

  const filled = Object.entries(s).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined && v !== false
  ).length;

  return (
    <fieldset className="border border-gray-200 rounded-2xl overflow-hidden">
      <style>{SECTION_STYLES}</style>

      <legend className="sr-only">Fabric and measurements</legend>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true">🧵</span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">
              Fabric, measurements &amp; authenticity
            </span>
            <span className="block text-xs text-gray-500">
              {filled > 0
                ? `${filled} field${filled === 1 ? "" : "s"} filled — these appear on the product page`
                : isSaree
                  ? "Required for sarees — this is what prevents returns"
                  : "Optional, but it reduces questions and returns"}
            </span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`text-gray-400 text-xl transition-transform shrink-0 ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>

      {open && (
        <div className="rk-fieldset-anim p-5 space-y-6 bg-white">
          {isSaree && (
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 flex gap-2.5">
              <FiInfo className="text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-teal-900 leading-relaxed">
                <strong>Why this matters for sarees.</strong> Buyers decide based on
                fabric, zari type, length and whether a blouse piece is included — and
                these are the exact reasons ethnic-wear returns happen. A saree
                without a stated length cannot be saved here.
              </p>
            </div>
          )}

          {/* ── Fabric ─────────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Fabric" htmlFor="spec-fabric" hint="e.g. Banarasi Silk (Katan), Chanderi Cotton">
              <input
                id="spec-fabric"
                value={s.fabric || ""}
                onChange={set("fabric")}
                placeholder="Banarasi Silk"
                className={textInput}
              />
            </Field>

            <Field
              label="Composition"
              htmlFor="spec-composition"
              hint="Say 100% silk vs art silk — buyers check this"
            >
              <input
                id="spec-composition"
                value={s.fabricComposition || ""}
                onChange={set("fabricComposition")}
                placeholder="100% Mulberry Silk"
                className={textInput}
              />
            </Field>

            <Field label="Weave" htmlFor="spec-weave">
              <select
                id="spec-weave"
                value={s.weave || ""}
                onChange={set("weave")}
                className={textInput}
              >
                <option value="">Not specified</option>
                <option value="Handloom">Handloom</option>
                <option value="Powerloom">Powerloom</option>
                <option value="Machine">Machine woven</option>
                <option value="Block Print">Block print</option>
                <option value="Hand Block Print">Hand block print</option>
              </select>
            </Field>

            <Field label="Occasion" htmlFor="spec-occasion" hint="Used as a filter and in search">
              <select
                id="spec-occasion"
                value={s.occasion || ""}
                onChange={set("occasion")}
                className={textInput}
              >
                <option value="">Not specified</option>
                {[
                  "Wedding",
                  "Bridal",
                  "Festive",
                  "Party",
                  "Office",
                  "Daily",
                  "Traditional",
                ].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Zari ──────────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Zari type"
              htmlFor="spec-zari"
              hint="Tested silk zari vs artificial/metallic film"
            >
              <select
                id="spec-zari"
                value={s.zariType || ""}
                onChange={set("zariType")}
                className={textInput}
              >
                <option value="">Not applicable / not specified</option>
                <option value="Tested Zari">Tested Zari (pure silk core)</option>
                <option value="Art Zari">Art Zari (metallic film)</option>
                <option value="Cotton Zari">Cotton Zari</option>
                <option value="Silver Zari">Silver Zari</option>
                <option value="Real Zari">Real Zari</option>
              </select>
            </Field>

            <Field label="Zari finish" htmlFor="spec-zari-finish">
              <select
                id="spec-zari-finish"
                value={s.zariFinish || ""}
                onChange={set("zariFinish")}
                className={textInput}
              >
                <option value="">Not specified</option>
                <option value="Gold">Gold</option>
                <option value="Antique Gold">Antique Gold</option>
                <option value="Silver">Silver</option>
                <option value="Copper">Copper</option>
                <option value="Pencil">Pencil / tested finish</option>
              </select>
            </Field>
          </div>

          {/* ── Measurements ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Measurements</h4>
            <p className="text-xs text-gray-500 mb-3">
              For a saree, length and width <em>are</em> the size. The body is
              free-size.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field
                label="Total length (m)"
                htmlFor="spec-length"
                error={errors.lengthMeters}
                hint="Including blouse piece if attached"
              >
                <input
                  id="spec-length"
                  type="number"
                  step="0.1"
                  min="0"
                  max="12"
                  inputMode="decimal"
                  value={s.lengthMeters ?? ""}
                  onChange={setNum("lengthMeters")}
                  placeholder="6.2"
                  className={textInput}
                  aria-invalid={Boolean(errors.lengthMeters)}
                />
              </Field>

              <Field label="Width (inches)" htmlFor="spec-width" hint="Usually 44–48">
                <input
                  id="spec-width"
                  type="number"
                  step="0.1"
                  min="0"
                  max="60"
                  inputMode="decimal"
                  value={s.widthInches ?? ""}
                  onChange={setNum("widthInches")}
                  placeholder="46"
                  className={textInput}
                />
              </Field>

              <Field label="Weight (g)" htmlFor="spec-weight" hint="Real silk feels substantial">
                <input
                  id="spec-weight"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={s.weightGrams ?? ""}
                  onChange={setNum("weightGrams")}
                  placeholder="650"
                  className={textInput}
                />
              </Field>
            </div>
          </div>

          {/* ── Blouse piece ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Blouse piece</h4>
            <p className="text-xs text-gray-500 mb-3">
              The most misunderstood attribute in this category. State it clearly and
              you'll prevent most "not as described" complaints.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <BoolToggle
                id="spec-blouse-included"
                checked={Boolean(s.blousePieceIncluded)}
                onChange={setBool("blousePieceIncluded")}
                label="Blouse piece included"
                description="Unstitched matching fabric from the same dye lot"
              />
              <BoolToggle
                id="spec-blouse-attached"
                checked={Boolean(s.blousePieceAttached)}
                onChange={setBool("blousePieceAttached")}
                label="Attached to the saree"
                description="Sewn on rather than packed separately"
              />
              <BoolToggle
                id="spec-fall-pico"
                checked={Boolean(s.fallPicoProvided)}
                onChange={setBool("fallPicoProvided")}
                label="Fall &amp; pico ready-made"
                description="Removes one step from the customer's tailoring"
              />
            </div>

            {s.blousePieceIncluded && (
              <div className="mt-3 max-w-xs">
                <Field
                  label="Blouse piece length (m)"
                  htmlFor="spec-blouse-length"
                  hint="0.8 m = short/elbow sleeves. 1.0 m+ = full sleeves, deep neckline."
                >
                  <input
                    id="spec-blouse-length"
                    type="number"
                    step="0.05"
                    min="0"
                    max="3"
                    inputMode="decimal"
                    value={s.blousePieceMeters ?? ""}
                    onChange={setNum("blousePieceMeters")}
                    placeholder="0.8"
                    className={textInput}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── Authenticity ──────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Authenticity</h4>
            <p className="text-xs text-gray-500 mb-3">
              These are government-issued and verifiable by the buyer — the only
              things that separate a proof from a marketing claim.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="GI tag reference"
                htmlFor="spec-gi"
                hint="e.g. GI Registry, Varanasi — cannot be self-declared"
              >
                <input
                  id="spec-gi"
                  value={s.giTag || ""}
                  onChange={set("giTag")}
                  placeholder="GI Registry, Varanasi"
                  className={textInput}
                />
              </Field>

              <Field label="HSN code on invoice" htmlFor="spec-hsn" hint="5007 = pure silk classification">
                <input
                  id="spec-hsn"
                  value={s.hsnCode || ""}
                  onChange={set("hsnCode")}
                  placeholder="5007"
                  className={textInput}
                />
              </Field>
            </div>

            <div className="mt-3">
              <BoolToggle
                id="spec-silkmark"
                checked={Boolean(s.silkMark)}
                onChange={setBool("silkMark")}
                label="Silk Mark certified"
                description="Hologram with a unique serial the customer can verify online"
              />
            </div>
          </div>

          {/* ── Colour & care ─────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 grid sm:grid-cols-2 gap-4">
            <Field
              label="Colour family"
              htmlFor="spec-colour"
              hint="Groups shades for filtering, e.g. Red, Pink, Blue"
            >
              <select
                id="spec-colour"
                value={s.colourFamily || ""}
                onChange={set("colourFamily")}
                className={textInput}
              >
                <option value="">Not specified</option>
                {[
                  "Red", "Pink", "Maroon", "Purple", "Blue", "Teal", "Green",
                  "Yellow", "Orange", "Gold", "Silver", "Black", "White",
                  "Grey", "Beige", "Cream", "Multicolour",
                ].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Care instructions" htmlFor="spec-care">
              <input
                id="spec-care"
                value={s.washCare || ""}
                onChange={set("washCare")}
                placeholder="Dry clean only. Store folded in a muslin wrap."
                className={textInput}
              />
            </Field>
          </div>

          {isSaree && !s.lengthMeters && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <FiAlertCircle className="shrink-0 mt-0.5" aria-hidden="true" />
              A saree without a stated length will be rejected on save. It is the one
              measurement that prevents "too short for my height" returns.
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
};

export default ProductSpecsEditor;