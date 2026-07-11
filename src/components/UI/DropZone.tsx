'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileWarning, Sparkles } from 'lucide-react';

const VALID_EXTENSIONS = ['.glb', '.gltf', '.stl', '.obj'];
import { usePartStore } from '@/store/usePartStore';
import { loadModelFromFile, loadModelFromUrl } from '@/lib/loaders';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadModel = usePartStore((s) => s.loadModel);
  const setModelLoading = usePartStore((s) => s.setModelLoading);

  const setModelScene = usePartStore((s) => s.setModelScene);

  const handleFile = useCallback(async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      setError(`Unsupported format: ${ext}. Please use GLB, STL, or OBJ files.`);
      return;
    }

    setError(null);
    setModelLoading(true, 0);

    try {
      const { scene, parts } = await loadModelFromFile(file, (p) => {
        setModelLoading(true, p);
      });
      setModelScene(scene);
      loadModel(parts, file.name);
    } catch (err) {
      console.error('Failed to load model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setModelLoading(false);
    }
  }, [loadModel, setModelLoading, setModelScene]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const modelFile = files.find((f) =>
        VALID_EXTENSIONS.includes('.' + f.name.split('.').pop()?.toLowerCase() || '')
      );

      if (modelFile) {
        handleFile(modelFile);
      } else if (files.length > 0) {
        setError('No supported 3D model file found. Drop a GLB, STL, or OBJ file.');
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleLoadDemo = useCallback(async () => {
    setError(null);
    setModelLoading(true, 0);
    try {
      const { scene, parts } = await loadModelFromUrl('/test_duck.glb', (p) => {
        setModelLoading(true, p);
      });
      setModelScene(scene);
      loadModel(parts, 'test_duck.glb');
    } catch (err) {
      console.error('Failed to load demo model:', err);
      setError(err instanceof Error ? err.message : 'Failed to load demo model');
      setModelLoading(false);
    }
  }, [loadModel, setModelLoading, setModelScene]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Full-bleed drop zone */}
      <div
        className={`pointer-events-auto w-full h-full flex flex-col items-center justify-center transition-all duration-200
          ${isDragging
            ? 'bg-[#3b82f6]/5 border-2 border-dashed border-[#3b82f6]'
            : 'bg-transparent'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {!isDragging && !error && (
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
            <div className="w-16 h-16 rounded-full bg-[#f7f7f8] border-2 border-dashed border-[#d4d4d8] flex items-center justify-center">
              <Upload size={24} className="text-[#d4d4d8]" />
            </div>
            <p className="text-sm text-[#6b6b70] font-medium">
              Drop a 3D model to begin
            </p>
            <p className="text-xs text-[#d4d4d8]">
              GLB · STL · OBJ
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors shadow-sm"
              >
                Browse Files
              </button>
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-white text-[#3b82f6] border border-[#3b82f6]/40 rounded-lg hover:bg-[#eff6ff] transition-colors shadow-sm"
              >
                <Sparkles size={12} />
                Load Demo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.stl,.obj"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {isDragging && (
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-[#3b82f6]" />
            <p className="text-sm text-[#3b82f6] font-medium">
              Drop to load model
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 max-w-xs text-center">
            <FileWarning size={24} className="text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 text-xs bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
