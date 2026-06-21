import { useState } from "react";
import { FiX, FiInfo } from "react-icons/fi";

const SIZE_CHART = {
  clothing: {
    headers: ["Size", "Chest (in)", "Waist (in)", "Hip (in)", "Length (in)"],
    rows: [
      ["XS", "32–33", "26–27", "34–35", "39–40"],
      ["S", "34–35", "28–29", "36–37", "40–41"],
      ["M", "36–38", "30–32", "38–40", "41–42"],
      ["L", "39–41", "33–35", "41–43", "42–43"],
      ["XL", "42–44", "36–38", "44–46", "43–44"],
      ["XXL", "45–47", "39–41", "47–49", "44–45"],
      ["3XL", "48–50", "42–44", "50–52", "45–46"],
    ],
  },
  saree: {
    headers: ["Type", "Length", "Width", "Blouse Piece", "Notes"],
    rows: [
      ["Standard Saree", "5.5 m", "1.1 m", "0.8 m included", "Fits most sizes"],
      ["Silk Saree", "6 m", "1.1 m", "0.8 m included", "Heavier drape"],
      ["Chiffon / Georgette", "5.5 m", "1.1 m", "0.8 m included", "Lightweight"],
      ["Heavy Bridal", "6.5 m", "1.2 m", "1 m included", "Extra material"],
    ],
  },
};

const HOW_TO_MEASURE = [
  { label: "Chest", desc: "Measure around the fullest part of your chest, keeping the tape parallel to the floor." },
  { label: "Waist", desc: "Measure around your natural waist, about 1 inch above your navel." },
  { label: "Hip", desc: "Measure around the fullest part of your hips, about 8 inches below your waist." },
];

const SizeGuideModal = ({ isOpen, onClose, category = "clothing" }) => {
  const [activeTab, setActiveTab] = useState(category === "saree" ? "saree" : "clothing");

  if (!isOpen) return null;

  const chart = SIZE_CHART[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-outfit text-xl font-bold text-gray-900">Size Guide</h2>
            <p className="text-gray-500 text-sm mt-0.5">Find your perfect fit</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
            aria-label="Close size guide"
          >
            <FiX className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {["clothing", "saree"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all capitalize ${
                activeTab === tab
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "clothing" ? "👗 Clothing" : "🥻 Sarees"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Size Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50">
                  {chart.headers.map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-primary-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    {row.map((cell, j) => (
                      <td key={j} className={`px-4 py-3 ${j === 0 ? "font-bold text-gray-900" : "text-gray-600"} whitespace-nowrap`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to Measure (clothing only) */}
          {activeTab === "clothing" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FiInfo className="w-4 h-4 text-primary-600" />
                <h3 className="font-semibold text-gray-900 text-sm">How to Measure</h3>
              </div>
              <div className="space-y-3">
                {HOW_TO_MEASURE.map(({ label, desc }) => (
                  <div key={label} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {label[0]}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              💡 <strong>Tip:</strong> If you're between sizes, we recommend sizing up for a comfortable fit.
              Still unsure? <a href="https://wa.me/919708756854" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Chat with us on WhatsApp</a> for personalized help!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizeGuideModal;
