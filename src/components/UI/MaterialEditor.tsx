'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Palette, Droplets, Sparkles } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1a1a1c] bg-[#f7f7f8] border-y border-[#e2e2e6]">
      {icon}
      {title}
    </div>
  );
}

export function MaterialEditor() {
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const updatePartMaterial = usePartStore((s) => s.updatePartMaterial);

  // Only show when exactly one part is selected and it has a mesh
  const part = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return parts[selectedIds[0]] ?? null;
  }, [parts, selectedIds]);

  const canEdit = useMemo(() => {
    if (!part) return false;
    const obj = part.object;
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh)) return false;
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    return mat != null && ('color' in mat);
  }, [part]);

  // Current material values
  const materialValues = useMemo(() => {
    if (!part || !canEdit) return null;
    const obj = part.object as THREE.Mesh;
    const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!('color' in mat)) return null;
    const standardMat = mat as THREE.MeshStandardMaterial;
    return {
      color: '#' + standardMat.color.getHexString(),
      roughness: standardMat.roughness ?? 0.5,
      metalness: standardMat.metalness ?? 0,
    };
  }, [part, canEdit]);

  if (!part || !canEdit || !materialValues) return null;

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePartMaterial(part.id, { color: e.target.value });
  };

  const handleRoughnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePartMaterial(part.id, { roughness: parseFloat(e.target.value) });
  };

  const handleMetalnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePartMaterial(part.id, { metalness: parseFloat(e.target.value) });
  };

  return (
    <div className="border-t border-[#e2e2e6]">
      <SectionHeader icon={<Palette size={13} />} title="Material" />

      {/* Color picker */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-[#6b6b70]">
            <Palette size={12} />
            <span>Color</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={materialValues.color}
              onChange={handleColorChange}
              className="w-7 h-7 rounded-md border border-[#e2e2e6] cursor-pointer bg-transparent p-0.5"
              title="Pick color"
            />
            <input
              type="text"
              value={materialValues.color}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                  updatePartMaterial(part.id, { color: val });
                }
              }}
              className="w-20 px-2 py-1 text-[10px] font-mono bg-[#f7f7f8] border border-[#e2e2e6] rounded
                text-[#1a1a1c] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {/* Roughness slider */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[#6b6b70]">
            <Droplets size={12} />
            <span>Roughness</span>
          </div>
          <span className="text-[10px] font-mono text-[#1a1a1c] font-medium">
            {materialValues.roughness.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialValues.roughness}
          onChange={handleRoughnessChange}
          className="w-full h-1.5 bg-[#e2e2e6] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6]
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
        />
        <div className="flex justify-between text-[9px] text-[#a1a1a7] mt-0.5 px-0.5">
          <span>Smooth</span>
          <span>Rough</span>
        </div>
      </div>

      {/* Metalness slider */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[#6b6b70]">
            <Sparkles size={12} />
            <span>Metalness</span>
          </div>
          <span className="text-[10px] font-mono text-[#1a1a1c] font-medium">
            {materialValues.metalness.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialValues.metalness}
          onChange={handleMetalnessChange}
          className="w-full h-1.5 bg-[#e2e2e6] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6]
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#3b82f6] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
        />
        <div className="flex justify-between text-[9px] text-[#a1a1a7] mt-0.5 px-0.5">
          <span>Dielectric</span>
          <span>Metallic</span>
        </div>
      </div>
    </div>
  );
}
