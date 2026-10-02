import { useState } from "react";
import { FiSliders, FiHelpCircle, FiCheck, FiChevronDown, FiChevronUp } from "react-icons/fi";

const HEIGHTS = [
  { label: "4'10\" – 5'0\" (147–152 cm)", value: "petite", pleats: "8 to 9 pleats", pallu: "Long & graceful (below knee)" },
  { label: "5'1\" – 5'4\" (155–163 cm) [Standard]", value: "medium", pleats: "7 to 8 pleats", pallu: "Classic fingertip / mid-calf" },
  { label: "5'5\" – 5'8\" (165–173 cm)", value: "tall", pleats: "6 to 7 pleats", pallu: "Comfortable knee-length" },
  { label: "5'9\" & above (175+ cm)", value: "extra-tall", pleats: "5 to 6 pleats", pallu: "Chic modern pallu (~65–75 cm)" },
];

const HEEL_OPTIONS = [
  { label: "Flats / Juttis (0 in)", factor: 0 },
  { label: "Kitten / Low Heels (1–2 in)", factor: 1 },
  { label: "High Heels / Stilettos (3+ in)", factor: 2 },
];

const DRAPE_STYLES = [
  {
    id: "nivi",
    name: "Classic Nivi (Standard)",
    desc: "Front waist pleats with pallu draped over the left shoulder.",
    pleatWidth: "5 to 5.5 inches",
  },
  {
    id: "seedha",
    name: "Gujarati / Seedha Pallu",
    desc: "Pallu taken from behind and pleated neatly over the right shoulder.",
    pleatWidth: "4 to 5 inches",
  },
  {
    id: "bengali",
    name: "Bengali Traditional",
    desc: "Two broad box pleats with the ornate pallu wrapped twice.",
    pleatWidth: "8 to 10 inches (box pleats)",
  },
];

export default function SareeDrapeCalculator({ sareeLength = 5.5, blouseLength = 0.8, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [heightIdx, setHeightIdx] = useState(1); // Default 5'1" - 5'4"
  const [heelIdx, setHeelIdx] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState("nivi");

  const currentHeight = HEIGHTS[heightIdx];
  const styleInfo = DRAPE_STYLES.find((s) => s.id === selectedStyle) || DRAPE_STYLES[0];

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/50 p-4 transition-all ${className}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 text-left w-full group"
          aria-expanded={isOpen}
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 group-hover:bg-amber-200 transition-colors">
            <FiSliders className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-outfit font-bold text-sm text-stone-900">
                Saree Drape &amp; Pleats Guide
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                Fit Reassurance
              </span>
            </div>
            <p className="text-xs text-stone-600 truncate mt-0.5">
              Will this 5.5m saree suit your height? Check estimated pleats and pallu fall.
            </p>
          </div>
          <div className="text-stone-400 group-hover:text-stone-700 transition-colors ml-2">
            {isOpen ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-amber-200/70 space-y-4 text-xs text-stone-800 animate-fadeIn">
          {/* Height Selector */}
          <div>
            <label className="block font-semibold text-stone-900 mb-1.5">
              1. Select Your Height:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HEIGHTS.map((h, idx) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHeightIdx(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    heightIdx === idx
                      ? "border-amber-600 bg-amber-100/70 text-amber-950 font-bold ring-1 ring-amber-600"
                      : "border-stone-200 bg-white hover:border-amber-400 text-stone-700"
                  }`}
                >
                  <p className="font-medium">{h.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Heels Selector */}
          <div>
            <label className="block font-semibold text-stone-900 mb-1.5">
              2. Footwear / Heels:
            </label>
            <div className="flex flex-wrap gap-2">
              {HEEL_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setHeelIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl border transition-all ${
                    heelIdx === idx
                      ? "border-amber-600 bg-amber-100 text-amber-950 font-bold"
                      : "border-stone-200 bg-white hover:border-amber-400 text-stone-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drape Style */}
          <div>
            <label className="block font-semibold text-stone-900 mb-1.5">
              3. Preferred Draping Style:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DRAPE_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStyle(st.id)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    selectedStyle === st.id
                      ? "border-amber-600 bg-amber-100 text-amber-950 font-bold"
                      : "border-stone-200 bg-white hover:border-amber-400 text-stone-700"
                  }`}
                >
                  <p className="font-semibold text-[11px]">{st.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Drape Calculation Result Card */}
          <div className="bg-white rounded-xl border border-amber-300 p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <span className="text-base">✨</span>
              <span className="font-bold text-stone-900 text-sm">
                Your Drape Estimation:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                <p className="text-[11px] text-stone-500 font-medium uppercase tracking-wider">
                  Front Pleats
                </p>
                <p className="text-sm font-bold text-amber-900 mt-0.5">
                  {currentHeight.pleats}
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  {styleInfo.pleatWidth} wide
                </p>
              </div>

              <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                <p className="text-[11px] text-stone-500 font-medium uppercase tracking-wider">
                  Pallu Drop Length
                </p>
                <p className="text-sm font-bold text-amber-900 mt-0.5">
                  {currentHeight.pallu}
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Full motif display
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-2.5 rounded-lg text-[11px] text-stone-700 space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-stone-900">
                <FiCheck className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Fabric Dimensions:</strong> {sareeLength}m Saree Body + {blouseLength}m Unstitched Blouse Piece (Total {Number((sareeLength + blouseLength).toFixed(2))}m).
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <FiCheck className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Pro Tip:</strong> Tuck in the basic wrap while wearing your chosen footwear so the hem sits perfectly 1 inch above the floor without catching on heels.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
