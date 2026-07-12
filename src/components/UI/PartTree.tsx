'use client';

import React, { useMemo } from 'react';
import { Eye, EyeOff, Target, ChevronRight, ChevronDown, RotateCcw, Cuboid, Box, Bone, Move3d, Hash, Layers, LayoutGrid, Image, Search } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import type { Part } from '@/types';

// Node type icon map
const NODE_ICONS: Record<string, React.ReactNode> = {
  'mesh': <Cuboid size={11} strokeWidth={1.5} />,
  'skinned-mesh': <Layers size={11} strokeWidth={1.5} />,
  'instanced-mesh': <LayoutGrid size={11} strokeWidth={1.5} />,
  'group': <Box size={11} strokeWidth={1.5} />,
  'bone': <Bone size={11} strokeWidth={1.5} />,
  'line': <Move3d size={11} strokeWidth={1.5} />,
  'points': <Hash size={11} strokeWidth={1.5} />,
  'sprite': <Image size={11} strokeWidth={1.5} />,
};

const DEFAULT_ICON = <Box size={11} strokeWidth={1.5} />;

/**
 * Build a tree hierarchy from the flat parts map using parentId.
 * Returns an array of root-level part IDs.
 */
function buildTree(parts: Record<string, Part>): string[] {
  const roots: string[] = [];
  for (const [id, part] of Object.entries(parts)) {
    if (!part.parentId || !parts[part.parentId]) {
      roots.push(id);
    }
  }
  // Sort roots by name for consistent ordering
  roots.sort((a, b) => (parts[a]?.name || a).localeCompare(parts[b]?.name || b));
  return roots;
}

/**
 * Check if a part matches the search query by name (case-insensitive).
 */
function partMatchesQuery(part: Part | undefined, query: string): boolean {
  if (!part || !query) return false;
  return part.name.toLowerCase().includes(query.toLowerCase());
}

/**
 * Check if a part or any of its descendants matches the search query.
 */
function hasMatchInSubtree(partId: string, parts: Record<string, Part>, query: string): boolean {
  if (!query) return true;
  const part = parts[partId];
  if (!part) return false;
  if (partMatchesQuery(part, query)) return true;
  if (part.children) {
    for (const childId of part.children) {
      if (hasMatchInSubtree(childId, parts, query)) return true;
    }
  }
  return false;
}

/**
 * Highlight the matched substring in a part name.
 */
function HighlightedName({ name, query }: { name: string; query: string }) {
  if (!query) {
    return <span className="flex-1 truncate">{name}</span>;
  }

  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerName.indexOf(lowerQuery);

  if (idx === -1) {
    return <span className="flex-1 truncate">{name}</span>;
  }

  const before = name.slice(0, idx);
  const match = name.slice(idx, idx + query.length);
  const after = name.slice(idx + query.length);

  return (
    <span className="flex-1 truncate">
      {before}
      <mark className="bg-[#3b82f6]/20 text-[#1a1a1c] rounded-sm px-0.5">{match}</mark>
      {after}
    </span>
  );
}

export function PartTree({ searchQuery = '' }: { searchQuery?: string }) {
  const parts = usePartStore((s) => s.parts);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const selectPart = usePartStore((s) => s.selectPart);
  const updatePartVisibility = usePartStore((s) => s.updatePartVisibility);
  const soloPart = usePartStore((s) => s.soloPart);
  const resetPart = usePartStore((s) => s.resetPart);

  const rootIds = useMemo(() => buildTree(parts), [parts]);
  const partEntries = Object.entries(parts);

  const hasQuery = searchQuery.trim().length > 0;

  // When filtering, compute which root nodes have matches in their subtrees
  const visibleRootIds = useMemo(() => {
    if (!hasQuery) return rootIds;
    return rootIds.filter((id) => hasMatchInSubtree(id, parts, searchQuery));
  }, [rootIds, parts, searchQuery, hasQuery]);

  if (partEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#6b6b70]">
        No parts loaded
      </div>
    );
  }

  // Show a "no results" state when search yields nothing
  if (hasQuery && visibleRootIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Search size={20} className="text-[#d4d4d8] mb-2" />
        <p className="text-xs text-[#6b6b70]">No parts match &quot;{searchQuery}&quot;</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {visibleRootIds.map((id) => (
        <PartTreeNode
          key={id}
          partId={id}
          parts={parts}
          selectedIds={selectedIds}
          depth={0}
          searchQuery={searchQuery}
          onSelect={selectPart}
          onToggleVisibility={updatePartVisibility}
          onSolo={soloPart}
          onReset={resetPart}
        />
      ))}
    </div>
  );
}

function PartTreeNode({
  partId,
  parts,
  selectedIds,
  depth,
  searchQuery = '',
  onSelect,
  onToggleVisibility,
  onSolo,
  onReset,
}: {
  partId: string;
  parts: Record<string, Part>;
  selectedIds: string[];
  depth: number;
  searchQuery?: string;
  onSelect: (id: string, multi: boolean) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onSolo: (id: string) => void;
  onReset: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const part = parts[partId];

  // Compute hasChildren and hasQuery safely (part may be null)
  const hasChildren = part ? (part.children && part.children.length > 0) : false;
  const hasQuery = searchQuery.trim().length > 0;

  // Compute shouldAutoExpand before useEffect (PartTreeNode is called with part=null
  // for hidden/filtered nodes, but the hooks must remain unconditional)
  const matchingDescendant = React.useMemo(() => {
    if (!part || !hasChildren || !hasQuery) return false;
    return (function checkDescendants(ids: string[]): boolean {
      for (const cid of ids) {
        const child = parts[cid];
        if (!child) continue;
        if (partMatchesQuery(child, searchQuery)) return true;
        if (child.children && checkDescendants(child.children)) return true;
      }
      return false;
    })(part.children!);
  }, [part, hasChildren, hasQuery, parts, searchQuery]);

  const selectedDescendant = React.useMemo(() => {
    if (!part || !hasChildren) return false;
    return (function checkSelectedDescendants(ids: string[]): boolean {
      for (const cid of ids) {
        if (selectedIds.includes(cid)) return true;
        const child = parts[cid];
        if (child?.children && child.children.length > 0) {
          if (checkSelectedDescendants(child.children)) return true;
        }
      }
      return false;
    })(part.children!);
  }, [part, hasChildren, selectedIds, parts]);

  const shouldAutoExpand = hasQuery ? matchingDescendant : selectedDescendant;

  React.useEffect(() => {
    if (shouldAutoExpand && !isExpanded) {
      setIsExpanded(true);
    }
  }, [shouldAutoExpand, isExpanded]);

  if (!part) return null;

  const isSelected = selectedIds.includes(partId);
  const isVisible = part.visible;
  const nodeType = part.metadata?.nodeType;
  const nodeIcon = nodeType ? (NODE_ICONS[nodeType] || DEFAULT_ICON) : DEFAULT_ICON;
  const depthPadding = depth * 12;

  // When searching, hide nodes that don't match and have no matching descendants
  const isHiddenByFilter = hasQuery && !hasMatchInSubtree(partId, parts, searchQuery);
  if (isHiddenByFilter) return null;

  // Check if this node itself matches the query (for highlighting)
  const isDirectMatch = hasQuery && partMatchesQuery(part, searchQuery);

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1 py-1.5 text-xs cursor-pointer transition-colors group
          ${isSelected
            ? 'bg-[#3b82f6]/10 text-[#1a1a1c] border-l-2 border-[#3b82f6]'
            : 'text-[#6b6b70] hover:bg-[#f7f7f8] border-l-2 border-transparent'
          }
          ${!isVisible ? 'opacity-50' : ''}
        `}
        style={{ paddingLeft: `${12 + depthPadding}px` }}
        onClick={(e) => onSelect(partId, e.shiftKey)}
      >
        {/* Expand/collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={`p-0.5 rounded hover:bg-[#e2e2e6] ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isExpanded ? (
            <ChevronDown size={12} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={12} strokeWidth={1.5} />
          )}
        </button>

        {/* Node type icon */}
        <span className="opacity-50 shrink-0">{nodeIcon}</span>

        {/* Part name with highlight */}
        <HighlightedName name={part.name || partId} query={isDirectMatch ? searchQuery : ''} />

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(partId, !isVisible);
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <Eye size={10} strokeWidth={1.5} /> : <EyeOff size={10} strokeWidth={1.5} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSolo(partId);
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title="Solo (isolate)"
          >
            <Target size={10} strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset(partId);
            }}
            className="p-1 rounded hover:bg-[#e2e2e6]"
            title="Reset transform"
          >
            <RotateCcw size={10} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Children (recursive) */}
      {isExpanded && hasChildren && (
        <div>
          {part.children!.map((childId) => (
            <PartTreeNode
              key={childId}
              partId={childId}
              parts={parts}
              selectedIds={selectedIds}
              depth={depth + 1}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onSolo={onSolo}
              onReset={onReset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
