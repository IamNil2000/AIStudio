'use client';

import React from 'react';
import { X, Upload, FileText, Box, Ruler, Trash2 } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import { PartTree } from './PartTree';

export function Sidebar() {
  const showSidebar = usePartStore((s) => s.showSidebar);
  const setShowSidebar = usePartStore((s) => s.setShowSidebar);
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const fileName = usePartStore((s) => s.fileName);
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const measurements = usePartStore((s) => s.measurements);
  const clearMeasurements = usePartStore((s) => s.clearMeasurements);
  const removeMeasurement = usePartStore((s) => s.removeMeasurement);
  const measureMode = usePartStore((s) => s.measureMode);
  const pendingMeasurePoint = usePartStore((s) => s.pendingMeasurePoint);
  const setMeasureMode = usePartStore((s) => s.setMeasureMode);

  if (!showSidebar) return null;

  const partCount = Object.keys(parts).length;

  return (
    <aside className="w-[280px] min-w-[280px] bg-white border-r border-[#e2e2e6] flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e6]">
        <div className="flex items-center gap-2">
          <Box size={18} className="text-[#3b82f6]" />
          <span className="text-sm font-semibold text-[#1a1a1c]">Parts</span>
        </div>
        <button
          onClick={() => setShowSidebar(false)}
          className="p-1 rounded hover:bg-[#f0f0f2] transition-colors"
          title="Close sidebar"
        >
          <X size={14} className="text-[#6b6b70]" />
        </button>
      </div>

      {/* Model info */}
      {modelLoaded && (
        <div className="px-4 py-2 border-b border-[#e2e2e6] bg-[#f7f7f8]">
          <div className="flex items-center gap-2 text-xs text-[#6b6b70]">
            <FileText size={12} />
            <span className="truncate flex-1">{fileName || 'Untitled'}</span>
          </div>
          <div className="text-xs text-[#6b6b70] mt-1">
            {partCount} part{partCount !== 1 ? 's' : ''}
            {selectedIds.length > 0 && (
              <span className="ml-2 text-[#3b82f6]">
                · {selectedIds.length} selected
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {modelLoaded ? (
          <>
            {/* Part tree section */}
            <PartTree />

            {/* Divider */}
            {measurements.length > 0 && (
              <div className="border-t border-[#e2e2e6] my-1" />
            )}

            {/* Measurements section */}
            {measurements.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Ruler size={13} className="text-[#3b82f6]" />
                    <span className="text-xs font-semibold text-[#1a1a1c]">
                      Measurements ({measurements.length})
                    </span>
                  </div>
                  <button
                    onClick={clearMeasurements}
                    className="p-1 rounded hover:bg-[#f0f0f2] transition-colors"
                    title="Clear all measurements"
                  >
                    <Trash2 size={11} className="text-[#6b6b70]" />
                  </button>
                </div>
                <div className="space-y-1">
                  {measurements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 px-2 py-1.5 bg-[#f7f7f8] rounded text-xs group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[#1a1a1c] font-mono font-medium">
                          {m.distance.toFixed(2)} units
                        </div>
                        <div className="text-[#6b6b70] truncate text-[10px]">
                          {m.point1.partName} → {m.point2.partName}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMeasurement(m.id)}
                        className="p-1 rounded hover:bg-[#e2e2e6] opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove measurement"
                      >
                        <X size={10} className="text-[#6b6b70]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Measure mode status */}
            {measureMode && (
              <div className="px-3 py-2 border-t border-[#e2e2e6]">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#eff6ff] rounded text-xs">
                  <Ruler size={12} className="text-[#3b82f6]" />
                  <span className="text-[#1a1a1c] flex-1">
                    {pendingMeasurePoint
                      ? 'Click a second part to complete measurement'
                      : 'Click a part to start measuring'}
                  </span>
                  <button
                    onClick={() => setMeasureMode(false)}
                    className="p-0.5 rounded hover:bg-[#dbeafe] transition-colors"
                  >
                    <X size={10} className="text-[#3b82f6]" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Upload size={32} className="text-[#d4d4d8] mb-3" />
            <p className="text-sm text-[#6b6b70]">
              Drop a 3D model to get started
            </p>
            <p className="text-xs text-[#d4d4d8] mt-1">
              Supports GLB, STL, OBJ
            </p>
          </div>
        )}
      </div>

      {/* Selection info footer */}
      {selectedIds.length > 0 && !measureMode && (
        <div className="px-4 py-2 border-t border-[#e2e2e6] bg-[#f7f7f8]">
          <p className="text-xs text-[#6b6b70]">
            {selectedIds.length === 1
              ? parts[selectedIds[0]]?.name || 'Selected part'
              : `${selectedIds.length} parts selected`}
          </p>
        </div>
      )}
    </aside>
  );
}
