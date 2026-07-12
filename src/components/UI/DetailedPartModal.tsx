'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Send, Check, Loader2, X } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';

/**
 * Collects all serializable details about a part for backend submission.
 */
function buildPartPayload(partId: string) {
  const state = usePartStore.getState();
  const part = state.parts[partId];
  if (!part) return null;

  return {
    meshUuid: part.id,
    partName: part.name,
    partNumber: part.cadInfo?.partNumber || null,
    material: part.cadInfo?.material || part.metadata?.materialName || null,
    mass: part.cadInfo?.mass || null,
    purpose: part.cadInfo?.purpose || null,
    constraints: part.cadInfo?.constraints || [],
    connectedTo: part.cadInfo?.connectedTo || [],
    manufacturingMethod: part.cadInfo?.manufacturingMethod || null,
    nodeType: part.metadata?.nodeType || null,
    vertexCount: part.metadata?.vertexCount || null,
    faceCount: part.metadata?.faceCount || null,
    boundingBox: part.metadata?.boundingBox || null,
    nodePath: part.metadata?.nodePath || null,
    parentId: part.parentId || null,
    children: part.children || [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sends part details to the backend.
 * The request may fail — that's expected since there's no backend yet.
 */
async function sendPartDetails(partId: string): Promise<boolean> {
  const payload = buildPartPayload(partId);
  if (!payload) return false;

  try {
    const response = await fetch('/api/part-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    // No backend available — silently ignore
    return false;
  }
}

interface DetailedPartModalProps {
  partId: string;
}

export function DetailedPartModal({ partId }: DetailedPartModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [visible, setVisible] = useState(false);
  const parts = usePartStore((s) => s.parts);
  const deselectAll = usePartStore((s) => s.deselectAll);
  const part = parts[partId];
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Animate entrance on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [partId]);

  const handleGetDetails = useCallback(async () => {
    if (sending || sent) return;
    setSending(true);
    const success = await sendPartDetails(partId);
    if (success) {
      setSent(true);
    }
    setSending(false);
  }, [partId, sending, sent]);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Delay deselect to allow exit animation to play before unmount
    closeTimerRef.current = setTimeout(() => deselectAll(), 200);
  }, [deselectAll]);

  if (!part) return null;

  return (
    <div
      key={partId}
      className="absolute top-3 right-3 z-30"
    >
      <div
        className={`bg-white rounded-xl shadow-lg border border-[#e2e2e6] w-64 overflow-hidden transition-all duration-200 ease-out ${
          visible
            ? 'opacity-100 translate-x-0 scale-100'
            : 'opacity-0 translate-x-4 scale-95'
        }`}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e2e2e6] bg-gradient-to-r from-[#fafafb] to-white">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-md bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1a1a1c] truncate leading-tight">
                {part.name || 'Selected Part'}
              </div>
              <div className="text-[10px] text-[#a1a1a7]">Part Details</div>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-5 h-5 rounded-md flex items-center justify-center text-[#a1a1a7] hover:text-[#1a1a1c] hover:bg-[#f0f0f2] transition-colors shrink-0 ml-2"
            title="Close (Esc)"
          >
            <X size={12} />
          </button>
        </div>

        {/* Quick info */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#a1a1a7]">Material</span>
            <span className="text-[#1a1a1c] font-medium">
              {part.cadInfo?.material || part.metadata?.materialName || '—'}
            </span>
          </div>
          {part.cadInfo?.mass && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#a1a1a7]">Mass</span>
              <span className="text-[#1a1a1c] font-medium">{part.cadInfo.mass}</span>
            </div>
          )}
          {part.cadInfo?.purpose && (
            <div className="text-[11px]">
              <span className="text-[#a1a1a7]">Purpose</span>
              <p className="text-[#1a1a1c] text-[10px] mt-0.5 leading-relaxed line-clamp-2">
                {part.cadInfo.purpose}
              </p>
            </div>
          )}
        </div>

        {/* Get Details button */}
        <div className="px-3 py-2 border-t border-[#e2e2e6] bg-[#fafafb]">
          <button
            onClick={handleGetDetails}
            disabled={sending || sent}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              sent
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-[#3b82f6] text-white hover:bg-[#2563eb] active:scale-[0.98] shadow-sm'
            }`}
          >
            {sending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <Check size={12} />
                Details Sent
              </>
            ) : (
              <>
                <Send size={12} />
                Get Details
              </>
            )}
          </button>
        </div>

        {/* Part ID footer */}
        <div className="px-3 py-1.5 border-t border-[#e2e2e6] bg-[#f7f7f8]">
          <div className="text-[9px] font-mono text-[#a1a1a7] truncate">
            UUID: {part.id.slice(0, 20)}…
          </div>
        </div>
      </div>
    </div>
  );
}
