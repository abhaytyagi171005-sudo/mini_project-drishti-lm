import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const FIELD_COLORS = {
  manufacturer: '#10b981',
  quantity: '#3b82f6',
  mrp: '#eab308',
  dates: '#a855f7',
  consumer_care: '#f97316',
  country_of_origin: '#ef4444',
};

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

  const boxes = [];
  if (product) {
    ['manufacturer', 'quantity', 'mrp', 'dates', 'consumer_care'].forEach((key) => {
      const bbox = product[key]?.bbox;
      if (Array.isArray(bbox) && bbox.length === 4) {
        boxes.push({ field: key, bbox, color: FIELD_COLORS[key] });
      }
    });
  }

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
        Inspected Label — click any box or chip to highlight
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

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${imgW} ${imgH}`}
          preserveAspectRatio="none"
        >
          {boxes.map(({ field, bbox, color }) => {
            const [x1, y1, x2, y2] = bbox;
            const isHighlighted = highlightedField === field;
            return (
              <g key={field}>
                <rect
                  x={x1}
                  y={y1}
                  width={Math.max(1, x2 - x1)}
                  height={Math.max(1, y2 - y1)}
                  stroke={color}
                  strokeWidth={isHighlighted ? 8 : 4}
                  fill={isHighlighted ? `${color}44` : 'transparent'}
                  className="cursor-pointer transition-all pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoxClick && onBoxClick(field);
                  }}
                />
                <text
                  x={x1 + 6}
                  y={Math.max(24, y1 - 8)}
                  fill={color}
                  fontSize="26"
                  fontWeight="bold"
                  style={{ textShadow: '0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1)' }}
                  className="pointer-events-none select-none"
                >
                  {FIELD_LABELS[field]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {boxes.length > 0 && (
        <div
          className="absolute bottom-6 flex flex-wrap justify-center gap-2 max-w-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {boxes.map(({ field, color }) => (
            <button
              key={field}
              onClick={() => onBoxClick && onBoxClick(field)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                highlightedField === field
                  ? 'bg-white text-slate-900 border-white'
                  : 'bg-black/60 text-white border-white/30 hover:border-white'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: color }} />
              {FIELD_LABELS[field]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}