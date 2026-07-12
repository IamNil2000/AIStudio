# PartForge — Task Reference

> **Purpose:** Developer reference listing every user task, where it was implemented, and key design decisions. Updated on each completed request.

---

## 1. Performance: Reduce GPU/CPU load for heavy 3D models

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **Canvas DPR cap** | Set `dpr={[0.4, 1.5]}` on `<Canvas>` — min 0.4×, max 1.5× pixel ratio | `Scene.tsx` |
| **Disable environment HDRI** | Removed `<Environment preset="studio">` — #1 GPU cost | `Scene.tsx` |
| **Simplify tone mapping** | Changed from `ACESFilmicToneMapping` to `LinearToneMapping` | `Scene.tsx` |
| **Disable antialiasing** | `antialias: false` in Canvas `gl` prop | `Scene.tsx` |
| **Remove rim light** | Removed one directional light | `Scene.tsx` |
| **Remove AdaptiveDpr/AdaptiveEvents** | Redundant with Canvas `dpr` range | `Scene.tsx` |
| **Disable shadow maps** | `gl.shadowMap.enabled = false` — biggest win during animation | `Scene.tsx` |
| **Remove GizmoHelper** | Removed axis indicator (small GPU cost per frame) | `Scene.tsx` |
| **Bounded grid** | Replaced `infiniteGrid` with `args={[30, 30]}` | `Scene.tsx` |
| **Hide grid during explode** | `{!isExploding && <Grid .../>}` | `Scene.tsx` |
| **Pre-allocated vectors** | 6 module-level `THREE.Vector3/Quaternion/Matrix4` reused in hot loop — eliminated GC pressure | `usePartStore.ts` |
| **Stable `parts` reference** | `applyExplode` no longer spreads `parts` — same reference prevents cascading UI re-renders from 9+ Zustand subscribers during animation | `usePartStore.ts` |
| **Always-sync position** | PartMesh `useFrame` always syncs wrapper position (cost ~10 float ops/part, negligible) | `Part.tsx` |
| **Skip hover during explode** | Hover opacity lerp skipped when `explodeTarget > 0.5` | `Part.tsx` |

**Key insight:** The real bottleneck was not matrix math but **cascading React re-renders** from spreading `{ ...state.parts }` every frame during explode. The stable reference fix was the critical optimization.

---

## 2. Disable part transformations (Ctrl+drag, Shift+drag)

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **Remove mouse interactions** | Entire `onMouseDown/onMouseMove/onMouseUp/onWheel` system removed | `Controls.tsx` |
| **Remove keyboard nudges** | Arrow keys, axis keys (x/y/z), duplicate (D), save transforms (S) removed | `Controls.tsx` |
| **Remove explode toggle (E)** | Removed from keyboard handler | `Controls.tsx` |
| **Remove transform space toggle (T)** | Removed from keyboard handler | `Controls.tsx` |
| **Keep basic navigation** | Escape, ?/F1, F (focus), Home (reset camera), H (hide), Ctrl+Z (undo), 1-7 (camera presets), Delete (hide), C (section view), Tab (cycle selection) still active | `Controls.tsx` |

---

## 3. Explode distance normalization (proportional to model size)

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **`modelScale` field** | Stores model radius computed from bounding box at load time | `types.ts` / `usePartStore.ts` |
| **`computeModelRadius()`** | Max distance from center to any part, minimum floor of 0.5 | `usePartStore.ts` |
| **Normalized spread** | `normalizedSpread = spread * modelScale * 0.04` — parts spread to ~40% of radius at toggle (10/15) and ~60% at max (15/15) | `usePartStore.ts` |

---

## 4. CAD Information Panel + Part Details Modal

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **`DetailedPartModal`** | Small modal at top-right of canvas viewport, shown when single part selected | `DetailedPartModal.tsx` |
| **Get Details button** | POSTs comprehensive payload to `/api/part-details` (silent catch on failure) | `DetailedPartModal.tsx` |
| **Rendered inside scene** | Modal is rendered in `Scene.tsx` (inside the `relative` container, alongside Canvas) not in page layout | `Scene.tsx` |
| **Entrance animation** | Slides in from right (`translate-x-4 → 0`) + fades (`opacity 0→1`) + scales (`scale-95→100`) over 200ms | `DetailedPartModal.tsx` |
| **Exit animation** | Close button triggers reverse animation, deselects after 200ms via timeout | `DetailedPartModal.tsx` |
| **Re-animate on part switch** | `key={partId}` forces remount, replaying entrance animation | `DetailedPartModal.tsx` |
| **Timeout cleanup** | `closeTimerRef` + `cancelAnimationFrame` in useEffect cleanup — no stale `deselectAll()` race | `DetailedPartModal.tsx` |
| **Part click → backend** | `sendPartClickToBackend()` POSTs to `/api/part-click` | `Part.tsx` |

---

## 5. Click outside to deselect

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **`onPointerMissed` on Canvas** | Built-in R3F prop — fires on `pointerup` when no 3D object hit | `Scene.tsx` |
| **`e.stopPropagation()` in PartMesh** | Part click handlers prevent deselection from firing on part click | `Part.tsx` |

---

## 6. Reassemble bug fixes

| Bug | Root cause | Fix | Files |
|-----|-----------|-----|-------|
| **Lerp stalling** | `MIN_CHANGE=0.06` too high — per-frame change (`spread * 0.04`) dropped below threshold at spread≈1.5, stalling reassemble at ~15% | Reduced to `0.0001` — stall point now spread≈0.0025, snap-to-target (0.001) fires before that | `ExplodeAnimator.tsx` |
| **`justReassembled` race condition** | PartMesh `useFrame` runs BEFORE ExplodeAnimator in R3F callback order — the one-shot sync fired before `applyExplode` updated matrices | Removed conditional logic entirely — always sync position (cost negligible) | `Part.tsx` |
| **ResetAll timing race** | Zustand `set()` is synchronous but React re-render is deferred — if rAF fires before commit, ExplodeAnimator's useEffect hadn't run, stale refs (spread=10) caused `applyExplode(9.6)` to overwrite freshly-reset matrices | Moved `resetVersion` check into `useFrame` via `knownResetVersion` ref — detected on first frame regardless of commit timing | `ExplodeAnimator.tsx` |

---

## 7. Reset All — explode state

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **`resetVersion` counter** | Incremented by `resetAll`, used to synchronize ExplodeAnimator ref resets | `types.ts` / `usePartStore.ts` |
| **`explodeTarget: 0` in resetAll** | Resets explode target so next toggle properly explodes (not reassemble again) | `usePartStore.ts` |
| **`knownResetVersion` ref** | Inline check inside `useFrame` — no dependency on React commit timing | `ExplodeAnimator.tsx` |
| **Smooth resetAll** | No longer copies matrices instantly — just sets `explodeTarget: 0` and lets ExplodeAnimator lerp from current spread back to 0 smoothly | `usePartStore.ts` |

---

## 8. Grid optimization

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **Bounded grid** | `args={[30, 30]}` instead of `infiniteGrid` — far fewer vertices | `Scene.tsx` |
| **Hide during explode** | `{!isExploding && <Grid .../>}` — saves GPU vertex processing during animation | `Scene.tsx` |

---

## 9. GLTF Animation support

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **AnimationPlayer** | Creates `THREE.AnimationMixer` on the model scene, plays first animation clip | `AnimationPlayer.tsx` |
| **AnimatedScene** | Renders the original model scene directly (replacing individual part rendering) when animation plays | `AnimationPlayer.tsx` / `Model.tsx` |
| **Play/Stop toggle** | Toolbar button with green active state | `Toolbar.tsx` |

**How it works:** When animation is active, `Model.tsx` switches from rendering individual `PartMesh` components to rendering the raw `AnimatedScene` (the original GLTF group) so the animation transforms are applied by the mixer.

---

## 10. Section View / Clipping Plane

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **Clipping plane** | Uses Three.js `clippingPlanes` on each material — creates cross-section effect revealing internal geometry | `SectionView.tsx` |
| **Axis selector** | X/Y/Z axis chooser in toolbar (only shown when section view is active) | `Toolbar.tsx` |
| **Visual indicator** | Semi-transparent blue plane + grid lines at the cut position | `SectionView.tsx` |
| **Keyboard shortcut** | `C` to toggle | `Controls.tsx` |

---

## 11. Measure mode (distance measurement)

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **Measure mode** | Toggle via toolbar button (ruler icon) or AddMeasurePoint in PartMesh | `Toolbar.tsx` / `Part.tsx` |
| **MeasurementLines** | Dashed line between two points, endpoint spheres, floating distance labels with HTML overlay | `MeasurementLines.tsx` |
| **Sidebar integration** | List of all measurements with distance values, part names, and delete buttons | `Sidebar.tsx` |
| **Pending state** | Amber indicator showing "Click second part..." during measurement | `MeasurementLines.tsx` |
| **Live update** | Positions recomputed from current part transforms (via `useMemo` on `parts`) | `MeasurementLines.tsx` |

---

## 12. Undo / History

| Aspect | Implementation | Files |
|--------|---------------|-------|
| **History stack** | Array of `HistoryEntry` (serialized part matrices + visibility) | `usePartStore.ts` |
| **Push on transform** | `pushHistory()` called before any transform operation | `usePartStore.ts` |
| **Undo** | `undo()` restores previous entry, capped at 50 entries | `usePartStore.ts` |
| **Keyboard shortcut** | `Ctrl+Z` | `Controls.tsx` |

---

## 13. UI Components

| Component | Purpose | Files |
|-----------|---------|-------|
| **Sidebar** | Left panel — contains PartTree, PartDetails, MaterialEditor, and measurements list. Collapsible via toolbar toggle or close button. | `Sidebar.tsx` |
| **PartTree** | Hierarchical tree view of all parts based on `parentId`. Shows node type icons, visibility toggle, solo (isolate), and reset transform per part. Supports search filtering with highlighted matches. | `PartTree.tsx` |
| **PartDetails** | Shows selected part info (name, ID, material, visibility, children/parent connections) in the sidebar | `PartDetails.tsx` |
| **PartInfoPanel** | Right-side panel shown when single part selected. Sections: Identity (ID, name, part number), Physical Properties (material with color swatch, mass, vertex count, manufacturing method), Purpose, Kinematic Constraints, Connected Parts (clickable), Additional Properties, Node Path. Copy-to-clipboard on values. | `PartInfoPanel.tsx` |
| **MaterialEditor** | Color picker, roughness slider, metalness slider for selected part's material | `MaterialEditor.tsx` |
| **Toolbar** | Bottom bar — part count, selection count, transform space toggle, explode/reassemble button + slider, measure button, section view toggle + axis, camera presets, reset all, animation play/stop, shortcuts button | `Toolbar.tsx` |
| **ShortcutManual** | Modal overlay listing all keyboard shortcuts (Camera, Selection, Part Manipulation, Global) | `ShortcutManual.tsx` |
| **DropZone** | File upload overlay shown when no model loaded — drag-and-drop area with "Drop a 3D model to get started" | `DropZone.tsx` |
| **LoadingOverlay** | Loading spinner + progress bar during model load | `LoadingOverlay.tsx` |
| **CanvasErrorBoundary** | Error boundary wrapping the 3D canvas — catches rendering errors gracefully | `CanvasErrorBoundary.tsx` |

---

## 14. Part operations

| Operation | Implementation | Files |
|-----------|---------------|-------|
| **Select** | `selectPart(id, multi)` — replaces or appends to `selectedIds` | `usePartStore.ts` |
| **Deselect all** | `deselectAll()` — empty `selectedIds` | `usePartStore.ts` |
| **Hide selected** | `hideSelected()` — sets `visible=false` on selected parts, clears selection | `usePartStore.ts` |
| **Solo (isolate)** | `soloPart(id)` — hides all parts except the specified one | `usePartStore.ts` |
| **Remove part** | `removePart(id)` — deletes part from the map | `usePartStore.ts` |
| **Reset single part** | `resetPart(id)` — copies `originalMatrix` to `currentMatrix`, sets visible | `usePartStore.ts` |
| **Duplicate selected** | `duplicateSelected()` — clones geometry + material, offsets position, pushes new part to store | `usePartStore.ts` |

---

## 15. Camera controls

| Feature | Implementation | Files |
|---------|---------------|-------|
| **OrbitControls** | Default Drei `OrbitControls` with damping | `Scene.tsx` |
| **Camera presets** | Keys 1-7 dispatch `CustomEvent('set-camera-view')` → `CameraPresetListener` sets camera position + controls target | `Controls.tsx` / `Scene.tsx` |
| **Focus on selection** | `F` key — computes centroid of selected parts, positions camera looking at centroid | `Controls.tsx` |
| **Reset camera** | `Home` key — resets to `(5, 5, 10)` looking at origin | `Controls.tsx` |
| **Auto-fit on load** | `useLayoutEffect` in `Model.tsx` computes bounding box of all parts, positions camera at `2.5× maxDim` distance | `Model.tsx` |

---

## 16. Model loading

| Feature | Implementation | Files |
|---------|---------------|-------|
| **File formats** | GLB/GLTF, STL, OBJ via `@react-three/drei` loaders | `loaders.ts` |
| **File picker** | Hidden `<input type="file">` triggered by "Open Model" / "Load Another" buttons | `page.tsx` |
| **Part extraction** | Traverses scene graph, extracts meshes with original matrices, computes bounding boxes, preserves metadata and CAD info from userData | `loaders.ts` |
| **Drag & drop** | DropZone component with drag-over visual feedback | `DropZone.tsx` |
| **Loading progress** | Progress bar driven by `modelLoadingProgress` (0→1) | `LoadingOverlay.tsx` |

---

## Architecture Notes

### Data flow during explode animation

```
User clicks Explode
  → toggleExplode() → set({ explodeTarget: 10 })
  → React re-renders Scene (grid hides)
  → ExplodeAnimator useFrame every rAF:
      → lerps currentSpread toward 10
      → calls applyExplode(currentSpread)
        → reads state.parts (SAME reference — no UI re-renders)
        → mutates each part.currentMatrix IN-PLACE
        → set({ parts }) — same reference, Zustand Object.is prevents subscriber re-renders
  → PartMesh useFrame every rAF:
      → reads state.parts[partId] from getState() (same Part object)
      → currentMatrix values are the latest (mutated by applyExplode)
      → decomposes + syncs wrapper position
```

### Why stable `parts` reference matters

Before: `applyExplode` did `const parts = { ...state.parts }` → new reference → `set({ parts })` → **9+ components** subscribed to `(s) => s.parts` re-render every frame (Sidebar, PartTree, PartInfoPanel, PartDetails, MaterialEditor, MeasurementLines, Model, Part × N).

After: Same `parts` reference → `Object.is` check prevents re-renders → only `useFrame` reads the mutated matrices.

### R3F useFrame execution order

Components mount in tree order → useFrame callbacks register in mounting order → all callbacks run sequentially in the rAF tick.

```
Model (contains PartMesh × N) — mounted first
  → PartMesh useFrame registered first
ExplodeAnimator — mounted after Model
  → ExplodeAnimator useFrame registered second
```

This means `PartMesh useFrame` runs **before** `ExplodeAnimator useFrame` in every frame. The one-frame delay (16ms) between matrix update and wrapper sync is imperceptible.

### Zustand `set()` vs React commit timing

```
resetAll calls set()  ──→  Zustand updates store synchronously
                              │
                              ├── useSyncExternalStore listeners queued
                              │     (React re-render deferred)
                              │
                              └── getState() returns updated state immediately
                                   (even before React commits)
```

If rAF fires before React commit, `getState()` returns new values BUT `useEffect` cleanup hasn't run. This is why `resetVersion` check must be inside `useFrame`, not in `useEffect`.
