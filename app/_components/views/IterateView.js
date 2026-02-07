import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { useImageToSite } from "./../../_context/image-to-site-context";
import IterationDock from "../IterationDock";
import IterationDockPanel from "../IterationDockPanel";
import IterationGuidesLayer from "../IterationGuidesLayer";
import IterationHistoryPanel from "../IterationHistoryPanel";
import IterationLayersPanel from "../IterationLayersPanel";
import IterationPatchPanel from "../IterationPatchPanel";
import IterationSampleSite from "../IterationSampleSite";
import IterationTextPanel from "../IterationTextPanel";
import IterationTransformControls from "../IterationTransformControls";
import IterationSidebarRail from "../IterationSidebarRail";

const IterationOverlayCanvas = dynamic(
  () => import("./IterationOverlayCanvas"),
  { ssr: false, loading: () => null }
);

const ITERATION_SCOPE = ".imageflow-iteration-site .iteration-preview-root";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseInlineStyle = (styleText) => {
  if (!styleText) {
    return undefined;
  }
  const style = {};
  styleText.split(";").forEach((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      return;
    }
    const prop = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (!prop || !value) {
      return;
    }
    const key = prop.startsWith("--")
      ? prop
      : prop.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    style[key] = value;
  });
  return Object.keys(style).length ? style : undefined;
};

// Scope preview styles so they don't leak outside the iteration canvas.
const scopeCss = (cssText, scopeSelector) => {
  if (!cssText || !scopeSelector) {
    return cssText || "";
  }
  const scopeMatcher = new RegExp(
    `(^|[\\s>+~])${escapeRegExp(scopeSelector)}([\\s>+~.#[:]|$)`
  );
  const scopeSelectors = (selectorText) => {
    const leading = selectorText.match(/^\s*/)?.[0] ?? "";
    const trimmed = selectorText.trim();
    if (!trimmed) {
      return selectorText;
    }
    const parts = trimmed.split(",");
    const scoped = parts
      .map((part) => {
        const selector = part.trim();
        if (!selector) {
          return "";
        }
        let replaced = selector.replace(
          /(^|[\s>+~])(:root|html|body)(?=$|[\s>+~.#[:])/gi,
          `$1${scopeSelector}`
        );
        if (scopeMatcher.test(replaced)) {
          return replaced;
        }
        return `${scopeSelector} ${replaced}`;
      })
      .filter(Boolean)
      .join(", ");
    return `${leading}${scoped}`;
  };

  let output = "";
  let buffer = "";
  let depth = 0;
  let inComment = false;
  let stringChar = null;
  let keyframesDepth = null;

  for (let i = 0; i < cssText.length; i += 1) {
    const char = cssText[i];
    const next = cssText[i + 1];

    if (inComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        i += 1;
        inComment = false;
      }
      continue;
    }

    if (stringChar) {
      buffer += char;
      if (char === "\\" && next) {
        buffer += next;
        i += 1;
        continue;
      }
      if (char === stringChar) {
        stringChar = null;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      buffer += char + next;
      i += 1;
      inComment = true;
      continue;
    }

    if (char === "\"" || char === "'") {
      buffer += char;
      stringChar = char;
      continue;
    }

    if (char === "{") {
      const trimmed = buffer.trim();
      const lower = trimmed.toLowerCase();
      const isAtRule = trimmed.startsWith("@");
      const isKeyframes =
        isAtRule &&
        (lower.startsWith("@keyframes") ||
          lower.startsWith("@-webkit-keyframes") ||
          lower.startsWith("@-moz-keyframes"));
      const shouldScope =
        !isAtRule && !(keyframesDepth !== null && depth >= keyframesDepth);
      output += shouldScope ? `${scopeSelectors(buffer)}{` : `${buffer}{`;
      buffer = "";
      depth += 1;
      if (isKeyframes) {
        keyframesDepth = depth;
      }
      continue;
    }

    if (char === "}") {
      output += `${buffer}}`;
      buffer = "";
      if (keyframesDepth !== null && depth === keyframesDepth) {
        keyframesDepth = null;
      }
      depth = Math.max(depth - 1, 0);
      continue;
    }

    buffer += char;
  }

  output += buffer;
  return output;
};

const buildIterationPreview = (html) => {
  if (!html || typeof window === "undefined") {
    return null;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((script) => script.remove());

  const styleTags = Array.from(doc.querySelectorAll("style"));
  const styleText = styleTags.map((style) => style.textContent || "").join("\n");
  styleTags.forEach((style) => style.remove());

  const body = doc.body;
  if (!body) {
    return null;
  }

  const usedIds = new Set();
  body.querySelectorAll("[data-gem-id]").forEach((element) => {
    const id = element.getAttribute("data-gem-id");
    if (id) {
      usedIds.add(id);
    }
  });

  let counter = 1;
  body.querySelectorAll("*").forEach((element) => {
    if (element.getAttribute("data-gem-id")) {
      return;
    }
    let id = `auto-${counter}`;
    while (usedIds.has(id)) {
      counter += 1;
      id = `auto-${counter}`;
    }
    element.setAttribute("data-gem-id", id);
    usedIds.add(id);
    counter += 1;
  });

  return {
    bodyHtml: body.innerHTML,
    bodyClass: body.getAttribute("class") ?? "",
    bodyStyle: parseInlineStyle(body.getAttribute("style") ?? ""),
    styles: styleText ? scopeCss(styleText, ITERATION_SCOPE) : "",
  };
};

export default function IterateView() {
  const { state, derived, actions, refs } = useImageToSite();
  const layoutRef = useRef(null);
  const previewHtml = state.previewItems[state.selectedPreviewIndex]?.html;
  const iterationPreview = useMemo(
    () => buildIterationPreview(previewHtml),
    [previewHtml]
  );
  const [dockState, setDockState] = useState({
    width: 240,
    detached: false,
    position: { top: 24, right: 24 },
  });
  const [panelHeights, setPanelHeights] = useState({
    history: 120,
    layers: 320,
    text: 340,
    patch: 220,
  });

  const handleDockResize = (width) => {
    setDockState((current) => ({
      ...current,
      width,
    }));
  };

  const handleDockMove = (position) => {
    setDockState((current) => ({
      ...current,
      position,
    }));
  };

  const handleDockDetachedChange = (detached) => {
    setDockState((current) => ({
      ...current,
      detached,
    }));
  };

  const handlePanelResize = (key) => (height) => {
    setPanelHeights((current) => ({
      ...current,
      [key]: height,
    }));
  };

  const showTextPanel = Boolean(state.textEditDraft) && state.showTextPanel;
  const showLayersPanel = state.showLayers && !showTextPanel;
  const showHistoryPanel = state.showHistory;
  const showDock =
    showLayersPanel || showTextPanel || showHistoryPanel || state.showPatch;
  const useSidebarRail = true;
  const showTransformControls =
    derived.canTransform &&
    state.showTransformControls &&
    state.selectedElementIds.length > 0;
  const showUnlinkControl =
    derived.canTransform &&
    state.showTransformControls &&
    derived.hasNestedSelection;
  const lockScale = state.scaleLock;
  const hasLayout = Object.keys(state.baseLayout ?? {}).length > 0;
  const isHintLinked = Object.values(state.layerFolders ?? {}).some((folder) =>
    (folder.layerIds ?? []).includes("feature-2-hint")
  );
  const showLinkHint = !hasLayout || isHintLinked;
  const canvasStyle = {
    transform: `translate3d(${derived.panOffset.x}px, ${derived.panOffset.y}px, 0) scale(${derived.zoomLevel})`,
  };

  return (
    <div className="imageflow-iteration" ref={refs.iterationRef}>
      <IterationSidebarRail />
      <div
        className="imageflow-iteration-layout"
        ref={layoutRef}
        style={{
          "--dock-width": dockState.detached || !showDock
            ? "0px"
            : `${dockState.width}px`,
          "--tool-rail-width": useSidebarRail ? "0px" : "68px",
        }}
      >
        <div className="imageflow-iteration-stage">
          <div
            className={`imageflow-iteration-preview${
              derived.isZoomTool ? " is-zoom-tool" : ""
            }${derived.isPanMode ? " is-pan-mode" : ""}${
              derived.isPanning ? " is-panning" : ""
            }`}
            ref={refs.iterationPreviewRef}
            onPointerDown={(event) => {
              actions.handlePanPointerDown(event);
              actions.handleZoomPointer(event);
            }}
            onPointerMove={actions.handlePanPointerMove}
            onPointerUp={actions.handlePanPointerEnd}
            onPointerLeave={actions.handlePanPointerEnd}
            onPointerCancel={actions.handlePanPointerEnd}
            onWheel={actions.handleZoomWheel}
          >
            <div className="imageflow-iteration-canvas" style={canvasStyle}>
              <IterationGuidesLayer />
              <div
                className={`imageflow-iteration-site${
                  derived.isOverlayTool ? " is-annotating" : ""
                }`}
                ref={refs.iterationSiteRef}
                onMouseDown={actions.handleSelectElement}
                onTouchStart={actions.handleSelectElement}
              >
                {iterationPreview ? (
                  <>
                    {iterationPreview.styles ? (
                      <style
                        dangerouslySetInnerHTML={{
                          __html: iterationPreview.styles,
                        }}
                      />
                    ) : null}
                    <div
                      className={`iteration-preview-root${
                        iterationPreview.bodyClass
                          ? ` ${iterationPreview.bodyClass}`
                          : ""
                      }`}
                      style={iterationPreview.bodyStyle}
                      dangerouslySetInnerHTML={{
                        __html: iterationPreview.bodyHtml,
                      }}
                    />
                  </>
                ) : (
                  <IterationSampleSite showLinkHint={showLinkHint} />
                )}
              </div>
              <div
                className="imageflow-iteration-overlay"
                style={{
                  pointerEvents: derived.overlayMode ? "auto" : "none",
                  cursor: derived.overlayMode ? "crosshair" : "default",
                }}
              >
                <IterationOverlayCanvas
                  width={derived.stageSize.width}
                  height={derived.stageSize.height}
                  overlayMode={derived.overlayMode}
                  annotations={state.annotations}
                  draftCircle={state.draftCircle}
                  pencilPoints={state.pencilPoints}
                  isPencilDrawing={state.isPencilDrawing}
                  onPointerDown={actions.handleOverlayPointerDown}
                  onPointerMove={actions.handleOverlayPointerMove}
                  onPointerEnd={actions.handleOverlayPointerEnd}
                />
              </div>
            </div>
            <IterationTransformControls
              previewRef={refs.iterationPreviewRef}
              siteRef={refs.iterationSiteRef}
              selectionIds={state.selectedElementIds}
              transformTargetId={derived.primaryMoveTargetId}
              isVisible={showTransformControls}
              showUnlink={showUnlinkControl}
              onUnlink={actions.handleUnlinkSelection}
              elementTransforms={state.elementTransforms}
              zoomLevel={derived.zoomLevel}
              panOffset={derived.panOffset}
              stageSize={derived.stageSize}
              textEdits={state.textEdits}
              scaleLock={state.scaleLock}
              onToggleScaleLock={actions.toggleScaleLock}
              onUpdateScale={actions.updateElementTransform}
              onUpdateFontSize={(id, value) =>
                actions.applyTextStyles(id, { fontSize: value }, "Transform")
              }
              getControlState={actions.getTransformControlState}
              onAlign={actions.handleAlignElements}
              alignmentScopeLabel={derived.alignmentScopeLabel}
              canAlign={derived.canAlign}
            />
            <span className="imageflow-iteration-zoom-indicator">
              {Math.round(derived.zoomLevel * 100)}%
            </span>
            <span className="imageflow-iteration-label">
              Preview {state.selectedPreviewIndex + 1}
            </span>
            {derived.canBoxSelect ? (
              <Selecto
                container={refs.iterationPreviewRef.current}
                rootContainer={refs.iterationPreviewRef.current}
                dragContainer={refs.iterationPreviewRef.current}
                boundContainer={refs.iterationPreviewRef.current}
                selectableTargets={[
                  ".imageflow-iteration-site [data-gem-id]:not(.is-layer-hidden):not(.is-layer-deleted)",
                ]}
                hitRate={0}
                selectByClick={false}
                selectFromInside={false}
                continueSelect={true}
                toggleContinueSelect="shift"
                ratio={0}
                onDragStart={(event) => {
                  const target = event.inputEvent?.target;
                  if (derived.isPanMode || derived.isPanning) {
                    event.stop();
                    return;
                  }
                  if (
                    target?.closest(".imageflow-iteration-toolbar") ||
                    target?.closest(".imageflow-iteration-dock") ||
                    target?.closest(".imageflow-iteration-layers") ||
                    target?.closest(".imageflow-iteration-text") ||
                    target?.closest(".moveable-control-box")
                  ) {
                    event.stop();
                  }
                }}
                onSelectEnd={actions.handleSelectoEnd}
              />
            ) : null}
          </div>
          {derived.canTransform && derived.moveTargets.length ? (
            <Moveable
              target={
                derived.moveTargets.length === 1 ? derived.moveTargets[0] : null
              }
              targets={
                derived.moveTargets.length > 1 ? derived.moveTargets : undefined
              }
              groupable={derived.moveTargets.length > 1}
              container={refs.iterationPreviewRef.current}
              rootContainer={refs.iterationPreviewRef.current}
              viewContainer={refs.iterationPreviewRef.current}
              snapContainer={refs.iterationPreviewRef.current}
              zoom={derived.zoomLevel}
              useAccuratePosition={true}
              draggable
              scalable
              rotatable
              keepRatio={lockScale}
              origin={false}
              snappable={state.snapToGrid || state.snapToGuides}
              snapGridWidth={state.snapToGrid ? state.gridSize : 0}
              snapGridHeight={state.snapToGrid ? state.gridSize : 0}
              snapGridAll={state.snapToGrid}
              snapThreshold={6}
              horizontalGuidelines={
                state.snapToGuides ? derived.horizontalGuides : []
              }
              verticalGuidelines={
                state.snapToGuides ? derived.verticalGuides : []
              }
              renderDirections={state.showTransformControls ? true : []}
              rotationPosition={state.showTransformControls ? "top" : "none"}
              hideDefaultLines={!state.showTransformControls}
              className={
                state.showTransformControls
                  ? "imageflow-moveable"
                  : "imageflow-moveable is-hidden"
              }
              onDragStart={({ set, target }) => {
                actions.handleTransformStart?.();
                const id = target?.dataset?.gemId;
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set([current.x, current.y]);
                }
              }}
              onDragEnd={() => actions.handleTransformEnd?.()}
              onDrag={({ target, beforeTranslate }) => {
                const id = target?.dataset?.gemId;
                if (target && id) {
                  actions.updateElementTransform(
                    id,
                    { x: beforeTranslate[0], y: beforeTranslate[1] },
                    target
                  );
                }
              }}
              onScaleStart={({ set, dragStart, target }) => {
                actions.handleTransformStart?.();
                const id = target?.dataset?.gemId;
                if (id) {
                  actions.handleScaleStart?.(id, target);
                }
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set([current.scaleX, current.scaleY]);
                  if (dragStart) {
                    dragStart.set([current.x, current.y]);
                  }
                }
              }}
              onScaleEnd={({ target }) => {
                const id = target?.dataset?.gemId;
                if (id) {
                  actions.handleScaleEnd?.(id);
                }
                actions.handleTransformEnd?.();
              }}
              onScale={({ target, scale, drag }) => {
                const id = target?.dataset?.gemId;
                if (!target || !id) {
                  return;
                }
                const next = {
                  scaleX: scale[0],
                  scaleY: scale[1],
                };
                if (drag?.beforeTranslate) {
                  next.x = drag.beforeTranslate[0];
                  next.y = drag.beforeTranslate[1];
                }
                actions.updateElementTransform(id, next, target);
              }}
              onRotateStart={({ set, dragStart, target }) => {
                actions.handleTransformStart?.();
                const id = target?.dataset?.gemId;
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set(current.rotate);
                  if (dragStart) {
                    dragStart.set([current.x, current.y]);
                  }
                }
              }}
              onRotateEnd={() => actions.handleTransformEnd?.()}
              onRotate={({ target, rotation, drag }) => {
                const id = target?.dataset?.gemId;
                if (!target || !id) {
                  return;
                }
                const next = { rotate: rotation };
                if (drag?.beforeTranslate) {
                  next.x = drag.beforeTranslate[0];
                  next.y = drag.beforeTranslate[1];
                }
                actions.updateElementTransform(id, next, target);
              }}
              onDragGroupStart={(event) => {
                actions.handleTransformStart?.();
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  const current = id ? actions.getTransformState?.(id) : null;
                  if (current) {
                    childEvent.set([current.x, current.y]);
                  }
                });
              }}
              onDragGroupEnd={() => actions.handleTransformEnd?.()}
              onDragGroup={(event) => {
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  if (!id) {
                    return;
                  }
                  actions.updateElementTransform(
                    id,
                    {
                      x: childEvent.beforeTranslate[0],
                      y: childEvent.beforeTranslate[1],
                    },
                    childEvent.target
                  );
                });
              }}
              onScaleGroupStart={(event) => {
                actions.handleTransformStart?.();
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  if (id) {
                    actions.handleScaleStart?.(id, childEvent.target);
                  }
                  const current = id ? actions.getTransformState?.(id) : null;
                  if (current) {
                    childEvent.set([current.scaleX, current.scaleY]);
                    if (childEvent.dragStart) {
                      childEvent.dragStart.set([current.x, current.y]);
                    }
                  }
                });
              }}
              onScaleGroupEnd={(event) => {
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  if (id) {
                    actions.handleScaleEnd?.(id);
                  }
                });
                actions.handleTransformEnd?.();
              }}
              onScaleGroup={(event) => {
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  if (!id) {
                    return;
                  }
                  const next = {
                    scaleX: childEvent.scale[0],
                    scaleY: childEvent.scale[1],
                  };
                  if (childEvent.drag?.beforeTranslate) {
                    next.x = childEvent.drag.beforeTranslate[0];
                    next.y = childEvent.drag.beforeTranslate[1];
                  }
                  actions.updateElementTransform(id, next, childEvent.target);
                });
              }}
              onRotateGroupStart={(event) => {
                actions.handleTransformStart?.();
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  const current = id ? actions.getTransformState?.(id) : null;
                  if (current) {
                    childEvent.set(current.rotate);
                    if (childEvent.dragStart) {
                      childEvent.dragStart.set([current.x, current.y]);
                    }
                  }
                });
              }}
              onRotateGroupEnd={() => actions.handleTransformEnd?.()}
              onRotateGroup={(event) => {
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  if (!id) {
                    return;
                  }
                  const next = { rotate: childEvent.rotation };
                  if (childEvent.drag?.beforeTranslate) {
                    next.x = childEvent.drag.beforeTranslate[0];
                    next.y = childEvent.drag.beforeTranslate[1];
                  }
                  actions.updateElementTransform(id, next, childEvent.target);
                });
              }}
            />
          ) : null}
          {state.pendingAnnotation ? (
            <div
              className="imageflow-iteration-note"
              style={derived.notePosition ?? undefined}
            >
              <label className="imageflow-iteration-note-label">Note</label>
              <textarea
                className="imageflow-iteration-note-input"
                rows={3}
                placeholder="Add a note..."
                value={state.noteDraft}
                onChange={(event) => actions.setNoteDraft(event.target.value)}
              />
              <div className="imageflow-iteration-note-actions">
                <button
                  className="imageflow-iteration-save"
                  type="button"
                  onClick={actions.handleSaveNote}
                >
                  Save
                </button>
                <button
                  className="imageflow-iteration-cancel"
                  type="button"
                  onClick={actions.handleCancelNote}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {!state.showLayers || !state.showHistory || (!showTextPanel && state.textEditDraft) ? (
          <div className="imageflow-iteration-panel-tabs">
            {!state.showHistory ? (
              <button
                className="imageflow-iteration-panel-tab"
                type="button"
                onClick={() => actions.setShowHistory(true)}
              >
                History
              </button>
            ) : null}
            {!state.showLayers ? (
              <button
                className="imageflow-iteration-panel-tab"
                type="button"
                onClick={() => actions.setShowLayers(true)}
              >
                Layers
              </button>
            ) : null}
            {!showTextPanel && state.textEditDraft ? (
              <button
                className="imageflow-iteration-panel-tab"
                type="button"
                onClick={() => actions.setShowTextPanel(true)}
              >
                Text
              </button>
            ) : null}
          </div>
        ) : null}
        {showDock ? (
          <IterationDock
            detached={dockState.detached}
            width={dockState.width}
            position={dockState.position}
            onResize={handleDockResize}
            onMove={handleDockMove}
            onDetachedChange={handleDockDetachedChange}
            containerRef={layoutRef}
          >
            {showHistoryPanel ? (
              <IterationDockPanel
                height={panelHeights.history}
                minHeight={90}
                maxHeight={220}
                onResize={handlePanelResize("history")}
              >
                <IterationHistoryPanel
                  entries={derived.historyEntries}
                  activeEntryId={derived.activeHistoryId}
                  canUndo={derived.canUndo}
                  canRedo={derived.canRedo}
                  onUndo={actions.handleUndoHistory}
                  onRedo={actions.handleRedoHistory}
                  onClose={() => actions.setShowHistory(false)}
                />
              </IterationDockPanel>
            ) : null}
            {showTextPanel ? (
              <IterationDockPanel
                height={panelHeights.text}
                minHeight={220}
                maxHeight={520}
                onResize={handlePanelResize("text")}
              >
                <IterationTextPanel
                  draft={state.textEditDraft}
                  onChangeText={actions.handleTextContentChange}
                  onChangeStyle={actions.handleTextStyleChange}
                  onReset={actions.handleResetTextEdit}
                  onClose={() => actions.setShowTextPanel(false)}
                />
              </IterationDockPanel>
            ) : null}
            {showLayersPanel ? (
              <IterationDockPanel
                height={panelHeights.layers}
                minHeight={240}
                maxHeight={620}
                onResize={handlePanelResize("layers")}
              >
                <IterationLayersPanel
                  layerFolders={derived.layerFolderEntries}
                  ungroupedLayerEntries={derived.ungroupedLayerEntries}
                  selectedElementIds={state.selectedElementIds}
                  onSelectLayer={(ids) => {
                    actions.setSelectedElementIds(ids);
                    actions.setSelectedElementId(ids[0] ?? null);
                  }}
                  onToggleLayerVisibility={actions.handleToggleLayerVisibility}
                  onToggleLayerLock={actions.handleToggleLayerLock}
                  onCreateFolder={actions.handleCreateLayerFolder}
                  onClose={() => actions.setShowLayers(false)}
                  onRenameFolder={actions.handleRenameLayerFolder}
                  onRemoveFolder={actions.handleRemoveLayerFolder}
                  onToggleFolderCollapse={actions.handleToggleLayerFolderCollapsed}
                  onAddSelectionToFolder={actions.handleAddSelectionToFolder}
                  onToggleFolderVisibility={actions.handleToggleLayerFolderVisibility}
                  onToggleFolderLock={actions.handleToggleLayerFolderLock}
                />
              </IterationDockPanel>
            ) : null}
            {state.showPatch ? (
              <IterationDockPanel
                height={panelHeights.patch}
                minHeight={160}
                maxHeight={400}
                onResize={handlePanelResize("patch")}
              >
                <IterationPatchPanel
                  patch={derived.iterationPatch}
                  onClose={() => actions.setShowPatch(false)}
                />
              </IterationDockPanel>
            ) : null}
          </IterationDock>
        ) : null}
      </div>
    </div>
  );
}
