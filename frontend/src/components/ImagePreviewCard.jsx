import React from 'react';
import { Image as ImageIcon, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

// Color per field for the overlay boxes
const FIELD_COLORS = {
  manufacturer: '#10b981',      // emerald-500
  quantity: '#3b82f6',           // blue-500
  mrp: '#eab308',                // yellow-500
  dates: '#a855f7',              // purple-500
  consumer_care: '#f97316',      // orange-500
  country_of_origin: '#ef4444',  // red-500
};

const FIELD_LABELS = {
  manufacturer: 'Manufacturer',
  quantity: 'Net Quantity',
  mrp: 'MRP',
  dates: 'Dates',
  consumer_care: 'Consumer Care',
  country_of_origin: 'Country of Origin',
};

export default function ImagePreviewCard({
  imageSrc,
  fileInfo,
  imageMetadata,
  product,
  highlightedField,
  onBoxClick,
  onRemove,
  onReplace,
}) {
  if (!imageSrc) return null;

  const quality = imageMetadata?.quality_label || 'GOOD';
  const textVis = imageMetadata?.text_visibility || 'CLEAR';

  const imgW = imageMetadata?.width || 900;
  const imgH = imageMetadata?.height || 900;

  // Collect all bboxes to render as overlays
  const boxes = [];
  if (product) {
    ['manufacturer', 'quantity', 'mrp', 'dates', 'consumer_care'].forEach((key) => {
      const bbox = product[key]?.bbox;
      if (Array.isArray(bbox) && bbox.length === 4) {
        boxes.push({ field: key, bbox, color: FIELD_COLORS[key] });
      }
    });
  }

  const hasBoxes = boxes.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <ImageIcon size={15} className="text-blue-800" />
          <span>Uploaded Package Image</span>
        </div>
        <div className="flex items-center gap-2">
          {onReplace && (
            <button
              onClick={onReplace}
              className="text-xs font-semibold text-slate-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
            >
              <RefreshCw size={12} />
              Replace
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={12} />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Image display with bounding-box overlay */}
      <div className="p-4 flex flex-col md:flex-row gap-4 items-start">
        {/* Fixed-aspect container: the image fills it, the SVG overlays 1:1 */}
        <div
          className="relative w-full md:w-64 bg-slate-900 rounded-lg overflow-hidden border border-slate-200 shrink-0"
          style={{ aspectRatio: `${imgW} / ${imgH}` }}
        >
          <img
            src={imageSrc}
            alt="Package Label"
            className="absolute inset-0 w-full h-full object-fill"
          />

          {hasBoxes && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
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
                      fill={isHighlighted ? `${color}33` : 'transparent'}
                      className="pointer-events-auto cursor-pointer transition-all"
                      onClick={() => onBoxClick && onBoxClick(field)}
                    />
                    <text
                      x={x1 + 4}
                      y={Math.max(18, y1 - 6)}
                      fill={color}
                      fontSize="18"
                      fontWeight="bold"
                      style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
                      className="pointer-events-none select-none"
                    >
                      {FIELD_LABELS[field]}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Metadata Details */}
        <div className="flex-1 w-full space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Filename</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5" title={fileInfo?.name || 'package_label.jpg'}>
                {fileInfo?.name || 'package_label.jpg'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block">Dimensions</span>
              <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                {imageMetadata?.width ? `${imageMetadata.width} × ${imageMetadata.height} px` : 'Approx. 1200 × 800 px'}
              </span>
            </div>
          </div>

          {/* Simple Quality Indicators */}
          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Image Quality
              </span>
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {quality}
              </span>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                Text Visibility
              </span>
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={13} className="text-blue-600" />
                {textVis}
              </span>
            </div>
          </div>

          {/* Legend */}
          {hasBoxes && (
            <div className="flex flex-wrap gap-2 text-[10px] pt-1">
              {boxes.map(({ field, color }) => (
                <button
                  key={field}
                  onClick={() => onBoxClick && onBoxClick(field)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
                    highlightedField === field
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {FIELD_LABELS[field]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}