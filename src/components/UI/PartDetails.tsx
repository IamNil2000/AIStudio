'use client';

import React from 'react';
import {
  Box,
  Cuboid,
  Bone,
  Image,
  Triangle,
  Move3d,
  LayoutGrid,
  Hash,
  Layers,
  Code,
} from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import type { PartNodeType } from '@/types';

const NODE_TYPE_CONFIG: Record<PartNodeType, { label: string; color: string; icon: React.ReactNode }> = {
  'mesh': { label: 'Mesh', color: '#3b82f6', icon: <Cuboid size={14} /> },
  'skinned-mesh': { label: 'Skinned Mesh', color: '#8b5cf6', icon: <Layers size={14} /> },
  'instanced-mesh': { label: 'Instanced Mesh', color: '#6366f1', icon: <LayoutGrid size={14} /> },
  'group': { label: 'Group', color: '#6b7280', icon: <Box size={14} /> },
  'bone': { label: 'Bone', color: '#f59e0b', icon: <Bone size={14} /> },
  'line': { label: 'Line', color: '#10b981', icon: <Move3d size={14} /> },
  'points': { label: 'Points', color: '#ec4899', icon: <Hash size={14} /> },
  'sprite': { label: 'Sprite', color: '#14b8a6', icon: <Image size={14} /> },
  'unknown': { label: 'Unknown', color: '#9ca3af', icon: <Box size={14} /> },
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 text-xs">
      <span className="text-[#6b6b70]">{label}</span>
      <span className="text-[#1a1a1c] font-medium text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1a1a1c] bg-[#f7f7f8] border-y border-[#e2e2e6]">
      {icon}
      {title}
    </div>
  );
}

export function PartDetails() {
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);

  // Only show details when exactly one part is selected
  if (selectedIds.length !== 1) return null;

  const part = parts[selectedIds[0]];
  if (!part) return null;

  const meta = part.metadata;
  if (!meta) {
    return (
      <div className="border-t border-[#e2e2e6]">
        <SectionHeader icon={<Box size={13} />} title="Part Details" />
        <div className="py-3 text-center text-xs text-[#6b6b70]">
          No metadata available
        </div>
      </div>
    );
  }

  const nodeCfg = NODE_TYPE_CONFIG[meta.nodeType] || NODE_TYPE_CONFIG.unknown;
  const parentPart = part.parentId ? parts[part.parentId] : null;

  return (
    <div className="border-t border-[#e2e2e6]">
      {/* Details header */}
      <SectionHeader icon={<Box size={13} />} title="Part Details" />

      {/* Node type badge */}
      <div className="px-3 py-2 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{
            backgroundColor: nodeCfg.color + '18',
            color: nodeCfg.color,
          }}
        >
          {nodeCfg.icon}
          {nodeCfg.label}
        </span>
        {meta.nodePath && (
          <span className="text-[10px] text-[#6b6b70] truncate flex-1 text-right" title={meta.nodePath}>
            {meta.nodePath.split('/').pop()}
          </span>
        )}
      </div>

      {/* Geometry stats */}
      {(meta.vertexCount !== undefined || meta.faceCount !== undefined) && (
        <>
          <SectionHeader icon={<Triangle size={13} />} title="Geometry" />
          {meta.vertexCount !== undefined && (
            <InfoRow label="Vertices" value={meta.vertexCount.toLocaleString()} />
          )}
          {meta.faceCount !== undefined && (
            <InfoRow label="Faces" value={meta.faceCount.toLocaleString()} />
          )}
        </>
      )}

      {/* Bounding box */}
      {meta.boundingBox && (
        <>
          <SectionHeader icon={<Move3d size={13} />} title="Dimensions" />
          <InfoRow label="Width" value={`${meta.boundingBox.width.toFixed(2)} u`} />
          <InfoRow label="Height" value={`${meta.boundingBox.height.toFixed(2)} u`} />
          <InfoRow label="Depth" value={`${meta.boundingBox.depth.toFixed(2)} u`} />
          {meta.boundingBoxCenter && (
            <InfoRow
              label="Center"
              value={`(${meta.boundingBoxCenter.x.toFixed(2)}, ${meta.boundingBoxCenter.y.toFixed(2)}, ${meta.boundingBoxCenter.z.toFixed(2)})`}
            />
          )}
        </>
      )}

      {/* Material info */}
      {meta.materialName && (
        <>
          <SectionHeader icon={<Image size={13} />} title="Material" />
          <InfoRow label="Name" value={meta.materialName} />
          {meta.materialColor && (
            <div className="flex items-center justify-between py-1.5 px-3 text-xs">
              <span className="text-[#6b6b70]">Color</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-[#e2e2e6] inline-block"
                  style={{ backgroundColor: meta.materialColor }}
                />
                <span className="text-[#1a1a1c] font-mono font-medium text-[10px]">{meta.materialColor}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hierarchy */}
      {part.parentId && parentPart && (
        <>
          <SectionHeader icon={<Layers size={13} />} title="Hierarchy" />
          <InfoRow label="Parent" value={parentPart.name} />
          {part.children && part.children.length > 0 && (
            <InfoRow label="Children" value={part.children.length} />
          )}
        </>
      )}

      {/* Node path */}
      {meta.nodePath && (
        <div className="border-t border-[#e2e2e6] px-3 py-2">
          <div className="text-[10px] text-[#6b6b70] mb-1">Node Path</div>
          <div className="text-[10px] text-[#1a1a1c] font-mono bg-[#f7f7f8] rounded px-2 py-1.5 leading-relaxed break-all">
            {meta.nodePath}
          </div>
        </div>
      )}

      {/* User data (custom properties from the original model) */}
      {meta.userData && Object.keys(meta.userData).length > 0 && (
        <>
          <SectionHeader icon={<Code size={13} />} title="Custom Data" />
          <div className="px-3 py-2 space-y-1">
            {Object.entries(meta.userData).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-[10px]">
                <span className="text-[#6b6b70] font-medium shrink-0 min-w-[80px]">{key}</span>
                <span className="text-[#1a1a1c] font-mono break-all">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
