'use client';

import React, { useState, useCallback } from 'react';
import {
  Info,
  Box,
  Weight,
  Wrench,
  Link2,
  Hash,
  Cpu,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import type { CadPartInfo } from '@/types';

/**
 * Map material names to display colors and properties.
 */
const MATERIAL_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  steel: { color: '#64748b', bg: '#f1f5f9', label: 'Steel' },
  'stainless steel': { color: '#94a3b8', bg: '#f8fafc', label: 'Stainless Steel' },
  aluminum: { color: '#94a3b8', bg: '#f0f9ff', label: 'Aluminum' },
  'cast iron': { color: '#57534e', bg: '#fafaf9', label: 'Cast Iron' },
  brass: { color: '#b45309', bg: '#fffbeb', label: 'Brass' },
  copper: { color: '#b91c1c', bg: '#fef2f2', label: 'Copper' },
  titanium: { color: '#78716c', bg: '#f5f5f4', label: 'Titanium' },
  plastic: { color: '#0ea5e9', bg: '#f0f9ff', label: 'Plastic' },
  rubber: { color: '#1e293b', bg: '#f8fafc', label: 'Rubber' },
  carbon: { color: '#1e293b', bg: '#f8fafc', label: 'Carbon Fiber' },
};

function getMaterialStyle(material?: string) {
  if (!material) return { color: '#6b6b70', bg: '#f7f7f8', label: 'Unknown' };
  const key = material.toLowerCase();
  return MATERIAL_STYLES[key] || { color: '#6b6b70', bg: '#f7f7f8', label: material };
}

function InfoRow({
  icon,
  label,
  value,
  copyable = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Clipboard API may fail in insecure contexts – silently ignore
      });
  }, []);

  if (!value && value !== 0) return null;

  return (
    <div className="group flex items-start gap-3 py-2.5 px-4 text-xs border-b border-[#f0f0f2] last:border-b-0 hover:bg-[#fafafb] transition-colors">
      <span className="shrink-0 mt-0.5 text-[#a1a1a7]">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium text-[#a1a1a7] uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-sm font-medium text-[#1a1a1c] break-words pr-2">
          {value}
        </div>
      </div>
      {copyable && typeof value === 'string' && value && (
        <button
          onClick={() => handleCopy(value)}
          className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#e2e2e6] transition-all mt-0.5"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} className="text-[#a1a1a7]" />
          )}
        </button>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#1a1a1c] bg-[#f7f7f8] border-y border-[#e2e2e6] sticky top-0 z-10">
      <span className="text-[#3b82f6]">{icon}</span>
      {title}
      {count !== undefined && (
        <span className="ml-auto text-[10px] font-mono text-[#a1a1a7] bg-white px-1.5 py-0.5 rounded border border-[#e2e2e6]">
          {count}
        </span>
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
      style={{
        backgroundColor: color ? color + '14' : '#f0f0f2',
        color: color || '#6b6b70',
      }}
    >
      {label}
    </span>
  );
}

export function PartInfoPanel() {
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Only show when exactly one part is selected
  if (selectedIds.length !== 1) return null;

  const part = parts[selectedIds[0]];
  if (!part) return null;

  const cadInfo: CadPartInfo | undefined = part.cadInfo;
  const materialStyle = getMaterialStyle(cadInfo?.material || part.metadata?.materialName);

  return (
    <div className="w-[300px] min-w-[300px] bg-white border-l border-[#e2e2e6] flex flex-col h-full overflow-hidden shadow-sm panel-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e2e6] bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-sm shrink-0">
            <Info size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#1a1a1c] truncate">
              {part.name || 'Unnamed Part'}
            </div>
            <div className="text-[10px] text-[#a1a1a7]">Part Information</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-[#f0f0f2] transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronUp size={14} className="text-[#6b6b70]" />
            ) : (
              <ChevronDown size={14} className="text-[#6b6b70]" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f2]">
          {/* Identity Section */}
          <div>
            <SectionHeader icon={<Box size={13} />} title="Identity" />
            <InfoRow
              icon={<Hash size={12} />}
              label="Part ID"
              value={
                <span className="font-mono text-[11px] text-[#6b6b70]">{part.id}</span>
              }
              copyable
            />
            <InfoRow
              icon={<Box size={12} />}
              label="Name"
              value={part.name || '—'}
            />
            {cadInfo?.partNumber && (
              <InfoRow
                icon={<Hash size={12} />}
                label="Part Number"
                value={cadInfo.partNumber}
                copyable
              />
            )}
          </div>

          {/* Material & Physical Properties */}
          <div>
            <SectionHeader
              icon={<Weight size={13} />}
              title="Physical Properties"
            />
            <div className="px-4 py-2.5 border-b border-[#f0f0f2]">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-[#e2e2e6]"
                  style={{ backgroundColor: materialStyle.color }}
                />
                <Tag label={materialStyle.label} color={materialStyle.color} />
                {cadInfo?.material && cadInfo.material.toLowerCase() !== materialStyle.label.toLowerCase() && (
                  <span className="text-[11px] text-[#6b6b70]">{cadInfo.material}</span>
                )}
              </div>
            </div>
            {cadInfo?.mass && (
              <InfoRow
                icon={<Weight size={12} />}
                label="Mass"
                value={
                  <span className="font-mono font-semibold text-[#1a1a1c]">
                    {cadInfo.mass}
                  </span>
                }
              />
            )}
            {part.metadata?.vertexCount !== undefined && (
              <InfoRow
                icon={<Hash size={12} />}
                label="Vertices"
                value={
                  <span className="font-mono text-[#6b6b70]">
                    {part.metadata.vertexCount.toLocaleString()}
                  </span>
                }
              />
            )}
            {cadInfo?.manufacturingMethod && (
              <InfoRow
                icon={<Cpu size={12} />}
                label="Manufacturing"
                value={cadInfo.manufacturingMethod}
              />
            )}
          </div>

          {/* Engineering Purpose */}
          {cadInfo?.purpose && (
            <div>
              <SectionHeader icon={<Wrench size={13} />} title="Purpose" />
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed text-[#1a1a1c]">
                  {cadInfo.purpose}
                </p>
              </div>
            </div>
          )}

          {/* Constraints */}
          {cadInfo?.constraints && cadInfo.constraints.length > 0 && (
            <div>
              <SectionHeader
                icon={<Wrench size={13} />}
                title="Kinematic Constraints"
                count={cadInfo.constraints.length}
              />
              <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                {cadInfo.constraints.map((c, i) => (
                  <Tag key={i} label={c} color="#8b5cf6" />
                ))}
              </div>
            </div>
          )}

          {/* Connected Parts */}
          {cadInfo?.connectedTo && cadInfo.connectedTo.length > 0 && (
            <div>
              <SectionHeader
                icon={<Link2 size={13} />}
                title="Connected To"
                count={cadInfo.connectedTo.length}
              />
              <div className="divide-y divide-[#f0f0f2]">
                {cadInfo.connectedTo.map((conn, i) => (
                  <ConnectedPartRow key={i} partName={conn} parts={parts} />
                ))}
              </div>
            </div>
          )}

          {/* Additional Properties */}
          {cadInfo?.properties && Object.keys(cadInfo.properties).length > 0 && (
            <div>
              <SectionHeader
                icon={<Info size={13} />}
                title="Additional Properties"
                count={Object.keys(cadInfo.properties).length}
              />
              <div className="divide-y divide-[#f0f0f2]">
                {Object.entries(cadInfo.properties).map(([key, value]) => (
                  <InfoRow
                    key={key}
                    icon={<Info size={12} />}
                    label={key}
                    value={value}
                    copyable
                  />
                ))}
              </div>
            </div>
          )}

          {/* Node Path */}
          {part.metadata?.nodePath && (
            <div className="px-4 py-3">
              <div className="text-[10px] font-medium text-[#a1a1a7] uppercase tracking-wider mb-1.5">
                Node Path
              </div>
              <div className="text-[10px] font-mono text-[#6b6b70] bg-[#f7f7f8] rounded-lg px-2.5 py-2 leading-relaxed break-all border border-[#e2e2e6]">
                {part.metadata.nodePath}
              </div>
            </div>
          )}

          {/* Backend Status */}
          <div className="px-4 py-3 bg-[#fafafb] border-t border-[#e2e2e6]">
            <div className="flex items-center gap-2 text-[10px] text-[#a1a1a7]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Ready to send to backend</span>
            </div>
            <div className="mt-1 text-[10px] font-mono text-[#a1a1a7] truncate">
              UUID: {part.id.slice(0, 24)}…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a connected part name with a link-style appearance.
 * If the connected part exists in the parts map, shows a clickable reference.
 */
function ConnectedPartRow({
  partName,
  parts,
}: {
  partName: string;
  parts: Record<string, { name: string; id: string; visible?: boolean }>;
}) {
  const selectPart = usePartStore((s) => s.selectPart);

  // Find the part by name in the parts map
  const matchedPart = Object.values(parts).find(
    (p) => p.name.toLowerCase() === partName.toLowerCase()
  );

  const handleClick = () => {
    if (matchedPart) {
      selectPart(matchedPart.id, false);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${
        matchedPart
          ? 'cursor-pointer hover:bg-[#eff6ff]'
          : ''
      }`}
      onClick={handleClick}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          matchedPart
            ? 'bg-green-400'
            : 'bg-[#d4d4d8]'
        }`}
      />
      <span className={matchedPart ? 'text-[#3b82f6] font-medium' : 'text-[#6b6b70]'}>
        {partName}
      </span>
      {matchedPart && (
        <ExternalLink size={10} className="text-[#93c5fd] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      {!matchedPart && (
        <span className="text-[10px] text-[#d4d4d8] ml-auto">Not in scene</span>
      )}
    </div>
  );
}
