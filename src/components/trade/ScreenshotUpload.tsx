"use client";

import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ScreenshotFile {
  file: File;
  preview: string;
  label?: string;
}

interface ScreenshotUploadProps {
  files: ScreenshotFile[];
  onChange: (files: ScreenshotFile[]) => void;
}

export function ScreenshotUpload({ files, onChange }: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
      const screenshots = imageFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      onChange([...files, ...screenshots]);
    },
    [files, onChange],
  );

  const removeFile = (index: number) => {
    const updated = [...files];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300">Screenshots</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-slate-700 bg-slate-900/30 hover:border-slate-600"
        }`}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-400">
          Drag & drop chart screenshots here, or{" "}
          <label className="cursor-pointer text-emerald-400 hover:text-emerald-300">
            browse files
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-slate-500">TradingView, MT4/MT5, broker execution screenshots</p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((item, i) => (
            <div key={item.preview} className="group relative overflow-hidden rounded-lg border border-slate-800">
              <img src={item.preview} alt={`Screenshot ${i + 1}`} className="aspect-video w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <ImageIcon className="h-3 w-3" />
                  {item.file.name.slice(0, 20)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { ScreenshotFile };
