'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { usePartStore } from '@/store/usePartStore';

export function ShortcutManual() {
  const showManual = usePartStore((s) => s.showManual);
  const setShowManual = usePartStore((s) => s.setShowManual);

  if (!showManual) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-[#e2e2e6] w-[640px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e2e6]">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[#3b82f6]" />
            <h2 className="text-base font-semibold text-[#1a1a1c]">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setShowManual(false)}
            className="p-1.5 rounded-lg hover:bg-[#f0f0f2] transition-colors"
          >
            <X size={16} className="text-[#6b6b70]" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Camera Controls */}
          <Section title="Camera Controls">
            <Shortcut keys={['Left drag']} desc="Orbit" />
            <Shortcut keys={['Right drag']} desc="Pan" />
            <Shortcut keys={['Scroll']} desc="Zoom" />
            <Shortcut keys={['F']} desc="Focus on selection" />
            <Shortcut keys={['Home']} desc="Reset camera" />
          </Section>

          {/* Selection */}
          <Section title="Selection">
            <Shortcut keys={['Click']} desc="Select part" />
            <Shortcut keys={['Shift', 'Click']} desc="Multi-select / deselect" />
            <Shortcut keys={['Esc']} desc="Deselect all" />
            <Shortcut keys={['Tab']} desc="Cycle selection" />
          </Section>

          {/* Part Manipulation */}
          <Section title="Part Manipulation">
            <Shortcut keys={['Ctrl', 'Left drag']} desc="Rotate part" />
            <Shortcut
              keys={['X / Y / Z', '+ Left drag']}
              desc="Axis-constrained translate"
            />
            <Shortcut
              keys={['X / Y / Z', '+ Ctrl+Left drag']}
              desc="Axis-constrained rotate"
            />
            <Shortcut keys={['Alt', 'Scroll']} desc="Translate along Y axis" />
            <Shortcut keys={['Shift', 'Left drag']} desc="Free translate (camera plane)" />
            <Shortcut keys={['Ctrl+Shift', 'Left drag']} desc="Uniform scale" />
            <Shortcut keys={['Arrow keys']} desc="Nudge (±X, ±Y)" />
            <Shortcut keys={['PageUp / PageDown']} desc="Nudge (±Z)" />
            <Shortcut keys={['Shift', 'Arrow/Page']} desc="Larger nudge steps" />
            <Shortcut keys={['Ctrl+D']} desc="Duplicate part" />
            <Shortcut keys={['H']} desc="Hide selected" />
            <Shortcut keys={['Ctrl+R']} desc="Reset transform" />
          </Section>

          {/* Global Shortcuts */}
          <Section title="Global">
            <Shortcut keys={['?']} desc="Toggle this manual" />
            <Shortcut keys={['E']} desc="Auto-explode animation" />
            <Shortcut keys={['T']} desc="Cycle transform space" />
            <Shortcut keys={['1-7']} desc="Camera presets (Front, Top, Right, Persp, Back, Left, Bottom)" />
            <Shortcut keys={['C']} desc="Toggle section view" />
            <Shortcut keys={['Ctrl+Z']} desc="Undo" />
            <Shortcut keys={['Space']} desc="Temporary orbit (held)" />
          </Section>
        </div>

        <div className="px-6 py-3 border-t border-[#e2e2e6] bg-[#f7f7f8] rounded-b-xl">
          <p className="text-xs text-[#6b6b70]">
            Press <kbd className="px-1 py-0.5 bg-white border border-[#e2e2e6] rounded text-[10px]">?</kbd> or{' '}
            <kbd className="px-1 py-0.5 bg-white border border-[#e2e2e6] rounded text-[10px]">F1</kbd> anytime to reopen this manual.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[#1a1a1c] uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#6b6b70]">{desc}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            <kbd className="px-1.5 py-0.5 bg-[#f7f7f8] border border-[#e2e2e6] rounded text-[10px] font-mono text-[#1a1a1c] min-w-[20px] text-center">
              {key}
            </kbd>
            {i < keys.length - 1 && (
              <span className="text-[#d4d4d8]">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
