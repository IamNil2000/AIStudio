'use client';

import React from 'react';
import { usePartStore } from '@/store/usePartStore';

export function LoadingOverlay() {
  const modelLoading = usePartStore((s) => s.modelLoading);
  const progress = usePartStore((s) => s.modelLoadingProgress);
  const fileName = usePartStore((s) => s.fileName);

  if (!modelLoading) return null;

  const percent = Math.round(progress * 100);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        {/* Spinner ring */}
        <div className="relative w-16 h-16">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#e2e2e6"
              strokeWidth="4"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(progress, 0.95))}`}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          {/* Percentage in the center */}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#3b82f6] font-mono">
            {percent}%
          </span>
        </div>

        {/* Label */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-[#1a1a1c]">
            Loading model...
          </p>
          {fileName && (
            <p className="text-xs text-[#6b6b70] max-w-[200px] truncate">
              {fileName}
            </p>
          )}
          {/* Loading dots animation */}
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
