import { useRef, useState } from "react";
import { Circle, Layer, Line, Stage, Text } from "react-konva";
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

export default function IterateView() {
  const { state, derived, actions, refs } = useImageToSite();
  const layoutRef = useRef(null);
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
                <IterationSampleSite showLinkHint={showLinkHint} />
              </div>
              <div
                className="imageflow-iteration-overlay"
                style={{
                  pointerEvents: derived.overlayMode ? "auto" : "none",
                  cursor: derived.overlayMode ? "crosshair" : "default",
                }}
              >
                <Stage
                  width={derived.stageSize.width}
                  height={derived.stageSize.height}
                  onMouseDown={actions.handleOverlayPointerDown}
                  onMouseMove={actions.handleOverlayPointerMove}
                  onMouseUp={actions.handleOverlayPointerEnd}
                  onMouseLeave={actions.handleOverlayPointerEnd}
                  onTouchStart={actions.handleOverlayPointerDown}
                  onTouchMove={actions.handleOverlayPointerMove}
                  onTouchEnd={actions.handleOverlayPointerEnd}
                  onTouchCancel={actions.handleOverlayPointerEnd}
                  listening={Boolean(derived.overlayMode)}
                >
                  <Layer>
                    {state.annotations.map((annotation) => (
                      <Circle
                        key={annotation.id}
                        x={annotation.x}
                        y={annotation.y}
                        radius={annotation.radius}
                        stroke="#f97316"
                        strokeWidth={2}
                      />
                    ))}
                    {state.annotations
                      .filter((annotation) => annotation.note)
                      .map((annotation) => (
                        <Text
                          key={`${annotation.id}-text`}
                          x={annotation.x + annotation.radius + 10}
                          y={annotation.y - annotation.radius}
                          text={annotation.note}
                          fontSize={13}
                          fill="#0f172a"
                          padding={6}
                          width={200}
                        />
                      ))}
                    {state.draftCircle ? (
                      <Circle
                        x={state.draftCircle.x}
                        y={state.draftCircle.y}
                        radius={state.draftCircle.radius}
                        stroke="#f97316"
                        strokeWidth={2}
                        dash={[6, 4]}
                      />
                    ) : null}
                    {state.pencilPoints.length >= 4 ? (
                      <Line
                        points={state.pencilPoints}
                        stroke="#0f766e"
                        strokeWidth={2}
                        lineJoin="round"
                        lineCap="round"
                        closed={state.isPencilDrawing}
                        fill={
                          state.isPencilDrawing
                            ? "rgba(15, 118, 110, 0.15)"
                            : "transparent"
                        }
                      />
                    ) : null}
                  </Layer>
                </Stage>
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
