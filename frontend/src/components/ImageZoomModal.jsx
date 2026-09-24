import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const FIELD_LABELS = {
  manufacturer: 'Manufacturer',
  quantity: 'Net Quantity',
  mrp: 'MRP',
  dates: 'Dates',
  consumer_care: 'Consumer Care',
  country_of_origin: 'Country of Origin',
};

export default function ImageZoomModal({
  isOpen,
  onClose,
  imageSrc,
  imageMetadata,
  product,
  highlightedField,
  onBoxClick,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  const imgW = imageMetadata?.width || 900;
  const imgH = imageMetadata?.height || 900;

  const availableFields = [];
  if (product) {
    ['manufacturer', 'quantity', 'mrp', 'dates', 'consumer_care'].forEach((key) => {
      const bbox = product[key]?.bbox;
      if (Array.isArray(bbox) && bbox.length === 4) {
        availableFields.push({ field: key, bbox });
      }
    });
  }

  // Only the active box is drawn
  const activeBox = availableFields.find((b) => b.field === highlightedField);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      <div className="absolute top-4 left-4 text-white text-sm font-semibold z-10">
        {highlightedField
          ? `Highlighting: ${FIELD_LABELS[highlightedField]}`
          : 'Click a chip below to locate a declaration'}
      </div>

      <div
        className="relative"
        style={{
          width: `min(90vw, ${(80 * imgW) / imgH}vh)`,
          aspectRatio: `${imgW} / ${imgH}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt="Package Label"
          className="absolute inset-0 w-full h-full object-fill rounded-lg shadow-2xl"
        />

        {/* Only the active box — thin black border, no fill */}
        {activeBox && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${imgW} ${imgH}`}
            preserveAspectRatio="none"
          >
            <rect
              x={activeBox.bbox[0]}
              y={activeBox.bbox[1]}
              width={Math.max(1, activeBox.bbox[2] - activeBox.bbox[0])}
              height={Math.max(1, activeBox.bbox[3] - activeBox.bbox[1])}
              stroke="#000"
              strokeWidth={5}
              fill="none"
              rx={4}
              ry={4}
            />
          </svg>
        )}
      </div>

      {availableFields.length > 0 && (
        <div
          className="absolute bottom-6 flex flex-wrap justify-center gap-2 max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {availableFields.map(({ field }) => (
            <button
              key={field}
              onClick={() => onBoxClick && onBoxClick(field)}
              className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                highlightedField === field
                  ? 'bg-white text-slate-900 border-white'
                  : 'bg-black/60 text-white border-white/30 hover:border-white'
              }`}
            >
              {FIELD_LABELS[field]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}