import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, RefreshCw, CheckCircle2, ZoomIn } from 'lucide-react';
import ImageZoomModal from './ImageZoomModal';

// Color per field for the overlay boxes
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
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (!imageSrc) return null;

  const quality = imageMetadata?.quality_label || 'GOOD';
  const textVis = imageMetadata?.text_visibility || 'CLEAR';
  const imgW = imageMetadata?.width || 900;
  const imgH = imageMetadata?.height || 900;

  // Collect bboxes present in the product data
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
    <>
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

        {/* Image display */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-64 shrink-0">
            <button
              onClick={() => setIsZoomOpen(true)}
              className="relative block w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in group"
              style={{ aspectRatio: `${imgW} / ${imgH}` }}
              title="Click to expand and inspect declarations"
            >
              <img
                src={imageSrc}
                alt="Package Label"
                className="absolute inset-0 w-full h-full object-fill"
              />

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 text-white text-xs font-bold bg-black/70 px-3 py-1.5 rounded-full">
                  <ZoomIn size={14} />
                  Click to expand
                </span>
              </div>

              {/* Tiny preview of boxes if any exist */}
              {hasBoxes && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imgW} ${imgH}`}
                  preserveAspectRatio="none"
                >
                  {boxes.map(({ field, bbox, color }) => {
                    const [x1, y1, x2, y2] = bbox;
                    return (
                      <rect
                        key={field}
                        x={x1}
                        y={y1}
                        width={Math.max(1, x2 - x1)}
                        height={Math.max(1, y2 - y1)}
                        stroke={color}
                        strokeWidth={3}
                        fill="transparent"
                        opacity={0.75}
                      />
                    );
                  })}
                </svg>
              )}
            </button>

            {hasBoxes && (
              <div className="text-[10px] text-slate-500 text-center mt-2">
                {boxes.length} declaration{boxes.length === 1 ? '' : 's'} located — click image to inspect
              </div>
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

            {/* Quality indicators */}
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

            {/* Legend chips */}
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

      {/* Fullscreen zoom modal */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        imageSrc={imageSrc}
        imageMetadata={imageMetadata}
        product={product}
        highlightedField={highlightedField}
        onBoxClick={onBoxClick}
      />
    </>
  );
}