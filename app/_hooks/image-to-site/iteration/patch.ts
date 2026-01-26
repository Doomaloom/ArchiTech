import { roundValue } from "../../../_lib/geometry";
import { ITERATION_SAMPLE } from "../../../_lib/iteration-sample";

import { isDefaultTransform, normalizeTransform } from "./constants";
import { deriveLayoutAxis } from "./geometry";

export const buildIterationPatch = ({
  isIterationMode,
  baseLayout,
  elementTransforms,
  layerState,
  layerFolders,
  layerFolderOrder,
  deletedLayerIds,
  highlightedIds,
  selectedElementIds,
  selectedPreviewIndex,
  siteBounds,
  iterationTool,
  annotations,
  textEdits,
}) => {
  if (!isIterationMode || !Object.keys(baseLayout).length) {
    return null;
  }

  const elements = Object.values(baseLayout).map((entry) => {
    const transform = normalizeTransform(elementTransforms[entry.id]);
    const next = {
      x: roundValue(entry.base.x + transform.x),
      y: roundValue(entry.base.y + transform.y),
      width: roundValue(entry.base.width * transform.scaleX),
      height: roundValue(entry.base.height * transform.scaleY),
      rotate: roundValue(transform.rotate),
    };
    return {
      id: entry.id,
      parentId: entry.parentId,
      tag: entry.tag,
      text: entry.text,
      order: entry.order,
      base: entry.base,
      next,
    };
  });

  const transformDeltas = {};
  elements.forEach((entry) => {
    const transform = normalizeTransform(elementTransforms[entry.id]);
    if (!isDefaultTransform(transform)) {
      transformDeltas[entry.id] = {
        x: roundValue(transform.x),
        y: roundValue(transform.y),
        scaleX: roundValue(transform.scaleX),
        scaleY: roundValue(transform.scaleY),
        rotate: roundValue(transform.rotate),
      };
    }
  });

  const locked = [];
  const hidden = [];
  Object.values(layerState).forEach((layer) => {
    if (layer.locked) {
      locked.push(layer.id);
    }
    if (layer.hidden) {
      hidden.push(layer.id);
    }
  });
  const deleted = deletedLayerIds;

  const folderSnapshot = layerFolderOrder
    .map((id, index) => {
      const folder = layerFolders[id];
      if (!folder) {
        return null;
      }
      return {
        id: folder.id,
        name: folder.name,
        layerIds: folder.layerIds ?? [],
        collapsed: Boolean(folder.collapsed),
        order: folder.order ?? index,
      };
    })
    .filter(Boolean);

  const annotationsSnapshot = annotations.map((annotation) => ({
    id: annotation.id,
    x: roundValue(annotation.x),
    y: roundValue(annotation.y),
    radius: roundValue(annotation.radius),
    note: annotation.note ?? "",
  }));

  const textEditsSnapshot = {};
  Object.entries(textEdits).forEach(([id, entry]) => {
    const styles = entry?.styles ?? {};
    const normalizedStyles = {};
    if (styles.fontSize != null) {
      normalizedStyles.fontSize = roundValue(styles.fontSize);
    }
    if (styles.lineHeight != null) {
      normalizedStyles.lineHeight = roundValue(styles.lineHeight);
    }
    if (styles.letterSpacing != null) {
      normalizedStyles.letterSpacing = roundValue(styles.letterSpacing);
    }
    if (styles.fontWeight) {
      normalizedStyles.fontWeight = styles.fontWeight;
    }
    if (styles.fontFamily) {
      normalizedStyles.fontFamily = styles.fontFamily;
    }
    if (styles.textAlign) {
      normalizedStyles.textAlign = styles.textAlign;
    }
    if (styles.textTransform) {
      normalizedStyles.textTransform = styles.textTransform;
    }
    if (styles.color) {
      normalizedStyles.color = styles.color;
    }
    const hasText = entry && entry.text != null;
    if (hasText || Object.keys(normalizedStyles).length) {
      textEditsSnapshot[id] = {
        text: hasText ? entry.text : null,
        styles: normalizedStyles,
      };
    }
  });

  const layoutHints = [];
  const groups = elements.reduce((acc, entry) => {
    const key = entry.parentId ?? "root";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {});

  Object.entries(groups).forEach(([parentId, entries]) => {
    if (entries.length < 2) {
      return;
    }
    const basePositions = entries.map((entry) => ({
      x: entry.base.x + entry.base.width / 2,
      y: entry.base.y + entry.base.height / 2,
    }));
    const nextPositions = entries.map((entry) => ({
      x: entry.next.x + entry.next.width / 2,
      y: entry.next.y + entry.next.height / 2,
    }));
    const baseAxis = deriveLayoutAxis(basePositions);
    const nextAxis = deriveLayoutAxis(nextPositions);
    if (baseAxis !== nextAxis) {
      layoutHints.push({
        parentId,
        from: baseAxis,
        to: nextAxis,
        ids: entries.map((entry) => entry.id),
      });
    }
  });

  return {
    schema: "gem.iteration.patch/v1",
    previewIndex: selectedPreviewIndex,
    generatedAt: new Date().toISOString(),
    tool: iterationTool,
    source: ITERATION_SAMPLE,
    layout: {
      bounds: siteBounds,
      elements,
    },
    transforms: transformDeltas,
    layers: {
      locked,
      hidden,
      deleted,
      groups: folderSnapshot,
    },
    highlights: highlightedIds,
    selection: selectedElementIds,
    annotations: annotationsSnapshot,
    textEdits: textEditsSnapshot,
    layoutHints,
  };
};
