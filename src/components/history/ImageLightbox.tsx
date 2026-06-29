"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt: string;
  label?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({ images, index, onClose, onNavigate }: ImageLightboxProps) {
  const open = index !== null;
  const current = index !== null ? images[index] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index !== null && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index !== null && index < images.length - 1) onNavigate(index + 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, index, images.length, onClose, onNavigate]);

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-slate-200 shadow-lg transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {images.length > 1 && index !== null && index > 0 && (
              <button
                type="button"
                onClick={() => onNavigate(index - 1)}
                className="absolute top-1/2 -left-4 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900/90 text-slate-200 hover:bg-slate-800"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {images.length > 1 && index !== null && index < images.length - 1 && (
              <button
                type="button"
                onClick={() => onNavigate(index + 1)}
                className="absolute top-1/2 -right-4 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900/90 text-slate-200 hover:bg-slate-800"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            <img
              src={current.src}
              alt={current.alt}
              className="max-h-[80vh] w-auto rounded-xl border border-slate-700 object-contain shadow-2xl"
            />

            {(current.label || images.length > 1) && (
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>{current.label ?? current.alt}</span>
                {images.length > 1 && index !== null && (
                  <span>
                    {index + 1} / {images.length}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
