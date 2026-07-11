'use client';

import React, { useCallback } from 'react';
import { PanelLeft, Upload } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';
import { Scene } from '@/components/Canvas/Scene';
import { Sidebar } from '@/components/UI/Sidebar';
import { Toolbar } from '@/components/UI/Toolbar';
import { DropZone } from '@/components/UI/DropZone';
import { LoadingOverlay } from '@/components/UI/LoadingOverlay';
import { CanvasErrorBoundary } from '@/components/UI/CanvasErrorBoundary';
import { ShortcutManual } from '@/components/UI/ShortcutManual';
import { loadModelFromFile } from '@/lib/loaders';

export default function Home() {
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const showSidebar = usePartStore((s) => s.showSidebar);
  const setShowSidebar = usePartStore((s) => s.setShowSidebar);
  const loadModel = usePartStore((s) => s.loadModel);

  const setModelScene = usePartStore((s) => s.setModelScene);
  const setAnimations = usePartStore((s) => s.setAnimations);
  const setAnimationPlaying = usePartStore((s) => s.setAnimationPlaying);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { scene, parts, animations } = await loadModelFromFile(file);
      setModelScene(scene);
      loadModel(parts, file.name);
      setAnimations(animations);
      // Reset animation state when loading a new model
      setAnimationPlaying(false);
    } catch (err) {
      console.error('Failed to load model:', err);
    }
  }, [loadModel, setModelScene, setAnimations, setAnimationPlaying]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#f7f7f8]">
      {/* Top bar */}
      <header className="h-12 min-h-[48px] flex items-center justify-between px-4 bg-white border-b border-[#e2e2e6] shadow-sm">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#1a1a1c] tracking-tight">
              PartForge
            </span>
          </div>

          <div className="h-4 w-px bg-[#e2e2e6]" />

          {/* Toggle sidebar */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSidebar
                ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                : 'text-[#6b6b70] hover:bg-[#f0f0f2]'
            }`}
            title="Toggle sidebar"
          >
            <PanelLeft size={16} />
          </button>

          {/* File name */}
          {modelLoaded && (
            <span className="text-sm text-[#6b6b70] font-medium truncate max-w-[200px]">
              {usePartStore.getState().fileName}
            </span>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {!modelLoaded ? (
            <>
              <input
                type="file"
                accept=".glb,.gltf,.stl,.obj"
                className="hidden"
                id="topbar-file-input"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="topbar-file-input"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#3b82f6] rounded-lg hover:bg-[#2563eb] transition-colors cursor-pointer shadow-sm"
              >
                <Upload size={14} />
                Open Model
              </label>
            </>
          ) : (
            <>
              <input
                type="file"
                accept=".glb,.gltf,.stl,.obj"
                className="hidden"
                id="topbar-file-input-2"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="topbar-file-input-2"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6b6b70] rounded-lg hover:bg-[#f0f0f2] transition-colors cursor-pointer border border-[#e2e2e6]"
              >
                <Upload size={14} />
                Load Another
              </label>
            </>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas area */}
        <div className="flex-1 relative">
          {/* Canvas with error boundary */}
          <CanvasErrorBoundary>
            <Scene />
          </CanvasErrorBoundary>

          {/* Loading overlay (shown during model loading) */}
          <LoadingOverlay />

          {/* Drop zone overlay (shown when no model is loaded) */}
          {!modelLoaded && <DropZone />}
        </div>
      </div>

      {/* Bottom toolbar */}
      <Toolbar />

      {/* Keyboard shortcut manual overlay */}
      <ShortcutManual />
    </div>
  );
}
