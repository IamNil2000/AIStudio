'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Target, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import type { Part } from '@/types';

export function PartTree() {
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const selectPart = usePartStore((s) => s.selectPart);
  const updatePartVisibility = usePartStore((s) => s.updatePartVisibility);
  const soloPart = usePartStore((s) => s.soloPart);
  const resetPart = usePartStore((s) => s.resetPart);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const partEntries = Object.entries(parts);

  if (partEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#6b6b70]">
        No parts loaded
      </div>
    );
  }

  return (
    <div className="py-1">
      {partEntries.map(([id, part]) => (
        <PartTreeItem
          key={id}
          partId={id}
          part={part}
          isSelected={selectedIds.includes(id)}
          isExpanded={expandedIds.has(id)}
          onSelect={(multi) => selectPart(id, multi)}
          onToggleExpand={() => toggleExpand(id)}
          onToggleVisibility={() => updatePartVisibility(id, !part.visible)}
          onSolo={() => soloPart(id)}
          onReset={() => resetPart(id)}
        />
      ))}
    </div>
  );
}

function PartTreeItem({
  partId,
  part,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onToggleVisibility,
  onSolo,
  onReset,
}: {
  partId: string;
  part: Part;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (multi: boolean) => void;
  onToggleExpand: () => void;
  onToggleVisibility: () => void;
  onSolo: () => void;
  onReset: () => void;
}) {
  const hasChildren = part.children && part.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer transition-colors group
          ${isSelected
            ? 'bg-[#3b82f6]/10 text-[#1a1a1c] border-l-2 border-[#3b82f6]'
            : 'text-[#6b6b70] hover:bg-[#f7f7f8] border-l-2 border-transparent'
          }
          ${!part.visible ? 'opacity-50' : ''}
        `}
        onClick={(e) => onSelect(e.shiftKey)}
      >
        {/* Expand/collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={`p-0.5 rounded hover:bg-[#e2e2e6] ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </button>

        {/* Part name */}
        <span className="flex-1 truncate">
          {part.name || partId}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title={part.visible ? 'Hide' : 'Show'}
          >
            {part.visible ? <Eye size={10} /> : <EyeOff size={10} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSolo();
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title="Solo (isolate)"
          >
            <Target size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title="Reset transform"
          >
            <RotateCcw size={10} />
          </button>
        </div>
      </div>

      {/* Children (if expanded) */}
      {isExpanded && hasChildren && (
        <div className="ml-4">
          {part.children!.map((childName) => (
            <div
              key={childName}
              className="px-3 py-1 text-xs text-[#6b6b70] truncate"
            >
              {childName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
