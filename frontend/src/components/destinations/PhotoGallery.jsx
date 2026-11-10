import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import { Camera, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

export default function PhotoGallery({ photos = [], destinationName = 'Destination' }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!photos || photos.length === 0) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold font-heading text-main flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Photo Gallery ({photos.length})
        </h3>
        <button
          onClick={() => setLightboxIndex(0)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View all photos
        </button>
      </div>

      {/* Grid Layout: 1 Hero Photo + Auxiliary Thumbnails */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Main Hero Photo */}
        <div
          onClick={() => setLightboxIndex(0)}
          className="sm:col-span-2 relative h-64 sm:h-80 rounded-2xl overflow-hidden cursor-pointer group bg-card-muted"
        >
          <img
            src={photos[0]}
            alt={`${destinationName} 1`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
          <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/60 backdrop-blur-md text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" /> Expand
          </div>
        </div>

        {/* Side Thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
          {photos.slice(1, 3).map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setLightboxIndex(idx + 1)}
              className="relative h-32 sm:h-[154px] rounded-2xl overflow-hidden cursor-pointer group bg-card-muted"
            >
              <img
                src={photo}
                alt={`${destinationName} ${idx + 2}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
              {idx === 1 && photos.length > 3 && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-white text-sm font-bold font-heading">
                  +{photos.length - 3} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10 backdrop-blur-sm z-50 transition-colors"
            title="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Controls */}
          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm z-50 transition-colors"
                title="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm z-50 transition-colors"
                title="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Lightbox Image Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex]}
              alt={`${destinationName} lightbox`}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-3 text-xs text-white/80 font-mono">
              {destinationName} &bull; Photo {lightboxIndex + 1} of {photos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

