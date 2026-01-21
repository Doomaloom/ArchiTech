import { useRef, useState } from "react";
import { Circle, Layer, Line, Stage, Text } from "react-konva";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { DEFAULT_ITERATION_TOOL } from "../../_lib/iteration-tools";
import { useImageToSite } from "../../_context/image-to-site-context";
import IterationDock from "../IterationDock";
import IterationLayersPanel from "../IterationLayersPanel";
import IterationPatchPanel from "../IterationPatchPanel";
import IterationSampleSite from "../IterationSampleSite";
import IterationTextPanel from "../IterationTextPanel";
import IterationToolbar from "../IterationToolbar";

export default function IterateView() {
  const { state, derived, actions, refs } = useImageToSite();
  const layoutRef = useRef(null);
  const [dockState, setDockState] = useState({
    width: 320,
    detached: false,
    position: { top: 24, right: 24 },
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

  const handleDockToggle = () => {
    setDockState((current) => ({
      ...current,
      detached: !current.detached,
    }));
  };

  const showDock = state.showLayers || derived.isTextTool || state.showPatch;
  const canvasStyle = {
    transform: `translate3d(${derived.panOffset.x}px, ${derived.panOffset.y}px, 0) scale(${derived.zoomLevel})`,
  };

  return (
    <div className="imageflow-iteration" ref={refs.iterationRef}>
      <div
        className="imageflow-iteration-layout"
        ref={layoutRef}
        style={{
          "--dock-width": dockState.detached || !showDock
            ? "0px"
            : `${dockState.width}px`,
        }}
      >
        <IterationToolbar
          iterationTool={state.iterationTool}
          onToolChange={actions.setIterationTool}
          selectedElementId={state.selectedElementId}
          highlightedIds={state.highlightedIds}
          onToggleHighlight={actions.handleToggleHighlight}
          canDelete={state.selectedElementIds.length > 0}
          onDeleteSelection={actions.handleDeleteSelection}
          showTransformControls={state.showTransformControls}
          onToggleTransformControls={() =>
            actions.setShowTransformControls((current) => !current)
          }
          showLayers={state.showLayers}
          onToggleLayers={() => actions.setShowLayers((current) => !current)}
          onRegenerate={() => {
            actions.setViewMode("preview");
            actions.setIterationTool(DEFAULT_ITERATION_TOOL);
          }}
          showPatch={state.showPatch}
          onTogglePatch={() => actions.setShowPatch((current) => !current)}
        />
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
              <div
                className={`imageflow-iteration-site${
                  derived.isOverlayTool ? " is-annotating" : ""
                }`}
                ref={refs.iterationSiteRef}
                onMouseDown={actions.handleSelectElement}
                onTouchStart={actions.handleSelectElement}
              >
                <IterationSampleSite />
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
              zoom={derived.zoomLevel}
              useAccuratePosition={true}
              draggable
              scalable
              rotatable
              keepRatio={false}
              origin={false}
              renderDirections={state.showTransformControls ? true : []}
              rotationPosition={state.showTransformControls ? "top" : "none"}
              hideDefaultLines={!state.showTransformControls}
              className={
                state.showTransformControls
                  ? "imageflow-moveable"
                  : "imageflow-moveable is-hidden"
              }
              onDragStart={({ set, target }) => {
                const id = target?.dataset?.gemId;
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set([current.x, current.y]);
                }
              }}
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
                const id = target?.dataset?.gemId;
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set([current.scaleX, current.scaleY]);
                  if (dragStart) {
                    dragStart.set([current.x, current.y]);
                  }
                }
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
                const id = target?.dataset?.gemId;
                const current = id ? actions.getTransformState?.(id) : null;
                if (current) {
                  set(current.rotate);
                  if (dragStart) {
                    dragStart.set([current.x, current.y]);
                  }
                }
              }}
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
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  const current = id ? actions.getTransformState?.(id) : null;
                  if (current) {
                    childEvent.set([current.x, current.y]);
                  }
                });
              }}
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
                event.events.forEach((childEvent) => {
                  const id = childEvent.target?.dataset?.gemId;
                  const current = id ? actions.getTransformState?.(id) : null;
                  if (current) {
                    childEvent.set([current.scaleX, current.scaleY]);
                    if (childEvent.dragStart) {
                      childEvent.dragStart.set([current.x, current.y]);
                    }
                  }
                });
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
        {showDock ? (
          <IterationDock
            detached={dockState.detached}
            width={dockState.width}
            position={dockState.position}
            onResize={handleDockResize}
            onMove={handleDockMove}
            onToggleDetached={handleDockToggle}
            containerRef={layoutRef}
          >
            {derived.isTextTool ? (
              <IterationTextPanel
                draft={state.textEditDraft}
                onChangeText={actions.handleTextContentChange}
                onChangeStyle={actions.handleTextStyleChange}
                onReset={actions.handleResetTextEdit}
              />
            ) : null}
            {state.showLayers ? (
              <IterationLayersPanel
                layerFolders={derived.layerFolderEntries}
                ungroupedLayerEntries={derived.ungroupedLayerEntries}
                selectedElementIds={state.selectedElementIds}
                onSelectLayer={(id) => {
                  actions.setSelectedElementIds([id]);
                  actions.setSelectedElementId(id);
                }}
                onToggleLayerVisibility={actions.handleToggleLayerVisibility}
                onToggleLayerLock={actions.handleToggleLayerLock}
                onCreateFolder={actions.handleCreateLayerFolder}
                onRenameFolder={actions.handleRenameLayerFolder}
                onRemoveFolder={actions.handleRemoveLayerFolder}
                onToggleFolderCollapse={actions.handleToggleLayerFolderCollapsed}
                onAddSelectionToFolder={actions.handleAddSelectionToFolder}
                onToggleFolderVisibility={actions.handleToggleLayerFolderVisibility}
                onToggleFolderLock={actions.handleToggleLayerFolderLock}
              />
            ) : null}
            {state.showPatch ? (
              <IterationPatchPanel patch={derived.iterationPatch} />
            ) : null}
          </IterationDock>
        ) : null}
      </div>
    </div>
  );
}
