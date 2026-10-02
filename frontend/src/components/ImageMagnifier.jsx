import { useState, useRef } from "react";
import { FiZoomIn, FiX } from "react-icons/fi";

/**
 * ImageMagnifier
 *
 * Allows shoppers to inspect intricate saree zari work, silk weave, border embroidery,
 * and fabric texture in high resolution.
 *
 * - Desktop: Smooth hover zoom lens
 * - Mobile / Click: Modal with high-resolution view
 */
export default function ImageMagnifier({
  src,
  alt,
  zoomLevel = 2.2,
  className = "",
  badge = null,
}) {
  const [showZoom, setShowZoom] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const imgRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <>
      <div
        className={`relative overflow-hidden cursor-crosshair group select-none ${className}`}
        onMouseEnter={() => setShowZoom(true)}
        onMouseLeave={() => setShowZoom(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setModalOpen(true)}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-200"
          loading="eager"
        />

        {/* Hover Zoom Overlay (Desktop) */}
        {showZoom && (
          <div
            className="absolute inset-0 pointer-events-none hidden md:block"
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
              backgroundSize: `${zoomLevel * 100}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        )}

        {/* Zari inspection badge prompt */}
        <div className="absolute bottom-3 left-3 bg-stone-900/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
          <FiZoomIn className="w-3.5 h-3.5 text-amber-300" />
          <span>Hover to inspect zari &amp; weave</span>
        </div>

        {badge}
      </div>

      {/* Full screen modal for high detail inspection */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fabric & zari inspection"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setModalOpen(false)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <FiZoomIn className="text-amber-400" /> Detailed Fabric &amp; Weave Inspection
            </span>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close fabric view"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-black flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>

          <p className="text-stone-300 text-xs mt-3">
            Real piece photography. Click outside or press close to return.
          </p>
        </div>
      )}
    </>
  );
}
