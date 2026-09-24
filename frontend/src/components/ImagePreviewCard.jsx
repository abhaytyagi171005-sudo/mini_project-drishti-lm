import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, RefreshCw, CheckCircle2, ZoomIn } from 'lucide-react';
import ImageZoomModal from './ImageZoomModal';

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

  // Fields that have a bbox available
  const availableFields = [];
  if (product) {
    ['manufacturer', 'quantity', 'mrp', 'dates', 'consumer_care'].forEach((key) => {
      const bbox = product[key]?.bbox;
      if (Array.isArray(bbox) && bbox.length === 4) {
        availableFields.push({ field: key, bbox });
      }
    });
  }
  const hasBoxes = availableFields.length > 0;

  // Only render the bbox for the currently highlighted field
  const activeBox = availableFields.find((b) => b.field === highlightedField);

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
              className="relative block w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in"
              style={{ aspectRatio: `${imgW} / ${imgH}` }}
              title="Click to expand and inspect declarations"
            >
              <img
                src={imageSrc}
                alt="Package Label"
                className="absolute inset-0 w-full h-full object-fill"
              />

              {/* Only the currently active box — thin black border, no fill */}
              {activeBox && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imgW} ${imgH}`}
                  preserveAspectRatio="none"
                >
                  <rect
                    x={activeBox.bbox[0]}
                    y={activeBox.bbox[1]}
                    width={Math.max(1, activeBox.bbox[2] - activeBox.bbox[0])}
                    height={Math.max(1, activeBox.bbox[3] - activeBox.bbox[1])}
                    stroke="#000"
                    strokeWidth={2}
                    fill="none"
                    rx={2}
                    ry={2}
                  />
                </svg>
              )}

              {/* Discreet expand hint */}
              <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                <ZoomIn size={11} />
                expand
              </div>
            </button>

            {hasBoxes && (
              <div className="text-[10px] text-slate-500 text-center mt-2">
                {highlightedField
                  ? `Showing: ${FIELD_LABELS[highlightedField]}`
                  : 'Click a chip below to locate a declaration'}
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

            {/* Field chips — clicking toggles the box on/off */}
            {hasBoxes && (
              <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                {availableFields.map(({ field }) => (
                  <button
                    key={field}
                    onClick={() => onBoxClick && onBoxClick(field)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${
                      highlightedField === field
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
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