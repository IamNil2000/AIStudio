'use client';

import React from 'react';
import {
  Move,
  RotateCcw,
  Type,
  Layers,
  MousePointer2,
  Ruler,
  Expand,
  Shrink,
  Play,
  Square,
} from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';

export function Toolbar() {
  const selectedIds = usePartStore((s) => s.selectedIds);
  const transformSpace = usePartStore((s) => s.transformSpace);
  const setTransformSpace = usePartStore((s) => s.setTransformSpace);
  const resetAll = usePartStore((s) => s.resetAll);
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const showManual = usePartStore((s) => s.showManual);
  const setShowManual = usePartStore((s) => s.setShowManual);
  const measureMode = usePartStore((s) => s.measureMode);
  const setMeasureMode = usePartStore((s) => s.setMeasureMode);
  const measurements = usePartStore((s) => s.measurements);
  const explodeTarget = usePartStore((s) => s.explodeTarget);
  const toggleExplode = usePartStore((s) => s.toggleExplode);
  const setExplodeTarget = usePartStore((s) => s.setExplodeTarget);
  const animationPlaying = usePartStore((s) => s.animationPlaying);
  const toggleAnimation = usePartStore((s) => s.toggleAnimation);
  const hasAnimations = usePartStore((s) => s.animations.length > 0);

  const spaceLabels: Record<string, string> = {
    local: 'Local',
    world: 'World',
    view: 'View',
  };

  const cycleSpace = () => {
    const spaces: Array<'local' | 'world' | 'view'> = ['local', 'world', 'view'];
    const idx = spaces.indexOf(transformSpace);
    setTransformSpace(spaces[(idx + 1) % spaces.length]);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-[#e2e2e6] shadow-sm">
      {/* Left: mode & transform info */}
      <div className="flex items-center gap-3">
        {/* Selection count */}
        <div className="flex items-center gap-1.5">
          <MousePointer2 size={14} className="text-[#6b6b70]" />
          <span className="text-xs text-[#6b6b70]">
            {modelLoaded
              ? `${Object.keys(usePartStore.getState().parts).length} parts`
              : 'No model loaded'}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#f7f7f8] rounded text-xs text-[#1a1a1c]">
            <Layers size={12} className="text-[#3b82f6]" />
            {selectedIds.length} selected
          </div>
        )}

        {/* Transform space toggle */}
        {modelLoaded && (
          <button
            onClick={cycleSpace}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#6b6b70] hover:bg-[#f0f0f2] transition-colors border border-transparent hover:border-[#e2e2e6]"
            title="Toggle transform space (T)"
          >
            <Move size={12} />
            <span>{spaceLabels[transformSpace]}</span>
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {modelLoaded && (
          <>
            {/* Explode toggle button */}
            <button
              onClick={toggleExplode}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors border ${
                explodeTarget > 0.5
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'text-[#6b6b70] hover:bg-[#f0f0f2] border-[#e2e2e6]'
              }`}
              title="Toggle explode (E)"
            >
              {explodeTarget > 0.5 ? <Shrink size={12} /> : <Expand size={12} />}
              {explodeTarget > 0.5 ? 'Reassemble' : 'Explode'}
            </button>

            {/* Explode slider */}
            {explodeTarget > 0.5 && (
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.1"
                  value={explodeTarget}
                  onChange={(e) => setExplodeTarget(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-[#3b82f6] cursor-pointer"
                  title="Explode spread amount"
                />
                <span className="text-[10px] text-[#6b6b70] font-mono w-6 text-right">
                  {explodeTarget.toFixed(1)}
                </span>
              </div>
            )}

            {/* Measure button */}
            <button
              onClick={() => setMeasureMode(!measureMode)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors border ${
                measureMode
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-sm'
                  : 'text-[#6b6b70] hover:bg-[#f0f0f2] border-[#e2e2e6]'
              }`}
              title="Measure distance between parts"
            >
              <Ruler size={12} />
              {measureMode ? 'Measuring...' : `Measure${measurements.length > 0 ? ` (${measurements.length})` : ''}`}
            </button>

            <button
              onClick={resetAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-[#6b6b70] hover:bg-[#f0f0f2] transition-colors border border-[#e2e2e6]"
              title="Reset all parts (Ctrl+R)"
            >
              <RotateCcw size={12} />
              Reset All
            </button>

            {/* Animation play/stop button */}
            {hasAnimations && (
              <button
                onClick={toggleAnimation}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors border ${
                  animationPlaying
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'text-[#6b6b70] hover:bg-[#f0f0f2] border-[#e2e2e6]'
                }`}
                title={animationPlaying ? 'Stop animation' : 'Play animation'}
              >
                {animationPlaying ? <Square size={12} /> : <Play size={12} />}
                {animationPlaying ? 'Stop' : 'Play'}
              </button>
            )}
          </>
        )}

        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs
            bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors shadow-sm"
          title="Toggle keyboard shortcuts manual"
        >
          <Type size={12} />
          {showManual ? 'Close Shortcuts' : 'Shortcuts'}
        </button>
      </div>
    </div>
  );
}
