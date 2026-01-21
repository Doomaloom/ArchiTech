"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { CODE_FILE_GROUPS, INITIAL_CODE_CONTENTS } from "../_lib/code-data";
import { DEMO_EDGES, DEMO_PAGES } from "../_lib/demo-data";
import buildFileTree from "../_lib/file-tree";
import formatFileSize from "../_lib/format";
import {
  averageDistance,
  buildTransformString,
  isPointInPolygon,
  median,
  roundValue,
} from "../_lib/geometry";
import { ITERATION_SAMPLE } from "../_lib/iteration-sample";
import {
  DEFAULT_ITERATION_TOOL,
  ITERATION_SELECTION_TOOLS,
  ITERATION_TOOL_MAP,
} from "../_lib/iteration-tools";
import { getLanguageFromFilename } from "../_lib/language";

const DEFAULT_TRANSFORM = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 };
const NOTE_RADIUS_MIN = 10;
const NOTE_PANEL_SIZE = { width: 240, height: 140 };

const normalizeTransform = (transform) => ({
  x: transform?.x ?? 0,
  y: transform?.y ?? 0,
  scaleX: transform?.scaleX ?? 1,
  scaleY: transform?.scaleY ?? 1,
  rotate: transform?.rotate ?? 0,
});

const isDefaultTransform = (transform) =>
  transform.x === 0 &&
  transform.y === 0 &&
  transform.scaleX === 1 &&
  transform.scaleY === 1 &&
  transform.rotate === 0;

const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);

const getPointerFromEvent = (event, bounds) => {
  const stage = event?.target?.getStage?.();
  const stagePos = stage?.getPointerPosition?.();
  if (stagePos) {
    return stagePos;
  }
  const clientX = event?.evt?.clientX ?? event?.clientX;
  const clientY = event?.evt?.clientY ?? event?.clientY;
  if (clientX == null || clientY == null || !bounds) {
    return null;
  }
  return {
    x: clientX - bounds.left,
    y: clientY - bounds.top,
  };
};

const deriveLayoutAxis = (positions) => {
  if (positions.length < 2) {
    return "single";
  }
  const xs = positions.map((point) => point.x);
  const ys = positions.map((point) => point.y);
  const xMedian = median(xs);
  const yMedian = median(ys);
  const xDeviation = averageDistance(xs, xMedian);
  const yDeviation = averageDistance(ys, yMedian);
  if (!xDeviation && !yDeviation) {
    return "single";
  }
  const ratio =
    Math.min(xDeviation, yDeviation) / Math.max(xDeviation, yDeviation);
  if (ratio > 0.6) {
    return "grid";
  }
  return xDeviation < yDeviation ? "column" : "row";
};

const TEXT_TAGS = new Set([
  "P",
  "SPAN",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BUTTON",
  "LABEL",
  "A",
  "LI",
  "SMALL",
  "STRONG",
  "EM",
]);

const clampNumber = (value, fallback) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
};

const normalizeColor = (value) => {
  if (!value) {
    return "#0f172a";
  }
  if (value.startsWith("rgb")) {
    const match = value.match(/rgba?\\(([^)]+)\\)/);
    if (!match) {
      return "#0f172a";
    }
    const [r, g, b] = match[1]
      .split(",")
      .slice(0, 3)
      .map((channel) => Number.parseInt(channel.trim(), 10));
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return "#0f172a";
    }
    const toHex = (channel) => channel.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return value;
};

const getEditableTextElement = (element) => {
  if (!element) {
    return null;
  }
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return element;
  }
  if (element.childElementCount > 0 && !TEXT_TAGS.has(element.tagName)) {
    return null;
  }
  const text = element.textContent ?? "";
  if (!text.trim()) {
    return null;
  }
  return element;
};

const getTextSnapshot = (element) => {
  if (!element || typeof window === "undefined") {
    return null;
  }
  const computed = window.getComputedStyle(element);
  const fontSize = clampNumber(parseFloat(computed.fontSize), 16);
  const lineHeightPx = parseFloat(computed.lineHeight);
  const lineHeight = clampNumber(lineHeightPx / fontSize, 1.4);
  const letterSpacing = clampNumber(parseFloat(computed.letterSpacing), 0);
  return {
    text: element.value ?? element.textContent ?? "",
    fontSize: roundValue(fontSize),
    lineHeight: roundValue(lineHeight),
    letterSpacing: roundValue(letterSpacing),
    fontWeight: computed.fontWeight || "500",
    fontFamily: computed.fontFamily || "system-ui, sans-serif",
    textAlign: computed.textAlign || "left",
    textTransform: computed.textTransform || "none",
    color: normalizeColor(computed.color),
  };
};

export default function useImageToSiteState() {
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState("start");
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState(60);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [customFiles, setCustomFiles] = useState([]);
  const [activeCodeFileId, setActiveCodeFileId] = useState(
    CODE_FILE_GROUPS[0].items[0].id
  );
  const [openCodeTabs, setOpenCodeTabs] = useState(() => [
    CODE_FILE_GROUPS[0].items[0],
    CODE_FILE_GROUPS[0].items[1],
  ]);
  const [codePanelMode, setCodePanelMode] = useState("agent");
  const [collapsedFolders, setCollapsedFolders] = useState(() => ({}));
  const [codeContents, setCodeContents] = useState(INITIAL_CODE_CONTENTS);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState([
    {
      role: "assistant",
      text: "Upload a layout or describe the UI changes and I will draft the code.",
    },
    {
      role: "assistant",
      text: "I can also open new files, refactor sections, and sync the theme.",
    },
  ]);
  const objectUrlsRef = useRef([]);
  const iterationRef = useRef(null);
  const iterationPreviewRef = useRef(null);
  const iterationSiteRef = useRef(null);
  const textBaseRef = useRef({});
  const [iterationTool, setIterationTool] = useState(DEFAULT_ITERATION_TOOL);
  const [showTransformControls, setShowTransformControls] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCircle, setDraftCircle] = useState(null);
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [iterationSize, setIterationSize] = useState({ width: 0, height: 0 });
  const [siteBounds, setSiteBounds] = useState({ width: 0, height: 0 });
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedElementIds, setSelectedElementIds] = useState(() => []);
  const [elementTransforms, setElementTransforms] = useState(() => ({}));
  const [textEdits, setTextEdits] = useState(() => ({}));
  const [textEditDraft, setTextEditDraft] = useState(null);
  const [layerState, setLayerState] = useState(() => ({}));
  const [highlightedIds, setHighlightedIds] = useState(() => []);
  const [baseLayout, setBaseLayout] = useState(() => ({}));
  const [showPatch, setShowPatch] = useState(false);
  const [pencilPoints, setPencilPoints] = useState([]);
  const [isPencilDrawing, setIsPencilDrawing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(
    DEMO_PAGES[0]?.id ?? null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(() =>
    DEMO_PAGES.map((page) => ({
      id: page.id,
      position: page.position,
      data: { label: page.label },
      type: "default",
    }))
  );
  const [edges, , onEdgesChange] = useEdgesState(DEMO_EDGES);

  const hasFile = Boolean(fileMeta);
  const dropTitle = hasFile
    ? "Image ready for conversion"
    : "Drop an image or click to browse";
  const dropMeta = hasFile
    ? "Drag a new file to replace the current one."
    : "PNG, JPG, WebP up to 12MB";
  const fileSizeLabel = useMemo(() => {
    if (!fileMeta) {
      return "";
    }
    return formatFileSize(fileMeta.size);
  }, [fileMeta]);

  const activePreview = gallery[activeIndex] ?? fileMeta?.previewUrl ?? null;
  const codeFileGroups = useMemo(() => {
    if (!customFiles.length) {
      return CODE_FILE_GROUPS;
    }
    return [
      ...CODE_FILE_GROUPS,
      {
        label: "Uploads",
        items: customFiles,
      },
    ];
  }, [customFiles]);
  const codeTreeGroups = useMemo(() => {
    return codeFileGroups.map((group) => ({
      label: group.label,
      tree: buildFileTree(group.items),
    }));
  }, [codeFileGroups]);
  const activeCodeFile = useMemo(() => {
    return codeFileGroups
      .flatMap((group) => group.items)
      .find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, codeFileGroups]);
  const fallbackCodeFile = useMemo(() => {
    return openCodeTabs.find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, openCodeTabs]);
  const resolvedCodeFile = activeCodeFile ?? fallbackCodeFile;
  const activeCodeLanguage = resolvedCodeFile?.language ?? "typescript";
  const activeCodeContent = codeContents[activeCodeFileId] ?? "";
  const isPreviewMode =
    viewMode === "preview" || viewMode === "selected" || viewMode === "iterate";
  const isIterationMode = viewMode === "iterate";

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const selectedId = DEMO_PAGES[activeIndex % DEMO_PAGES.length]?.id ?? null;
    if (selectedId) {
      setSelectedNodeId(selectedId);
    }
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedId,
      }))
    );
  }, [activeIndex, setNodes]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const selectedNodeLabel =
    DEMO_PAGES.find((page) => page.id === selectedNodeId)?.label ?? "Unknown";
  const qualityValue = 100 - speedValue;

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    const handleClick = (event) => {
      const target = event.currentTarget;
      const step = target?.dataset?.imageflowStep;
      if (step) {
        setViewMode(step);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener("click", handleClick);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("click", handleClick);
      });
    };
  }, []);

  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll("[data-imageflow-step]")
    );

    buttons.forEach((button) => {
      const step = button?.dataset?.imageflowStep;
      if (!step) {
        return;
      }
      const isActive =
        step === viewMode ||
        (step === "preview" &&
          (viewMode === "selected" || viewMode === "iterate"));
      button.classList.toggle("is-active", isActive);
    });
  }, [viewMode]);

  useEffect(() => {
    if (!isIterationMode || !iterationPreviewRef.current) {
      return;
    }
    const element = iterationPreviewRef.current;
    const updateSize = () => {
      setIterationSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, [isIterationMode]);

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    if (Object.keys(baseLayout).length) {
      return;
    }
    const container = iterationSiteRef.current;
    const containerRect = container.getBoundingClientRect();
    setSiteBounds({
      width: containerRect.width,
      height: containerRect.height,
    });
    const elements = Array.from(container.querySelectorAll("[data-gem-id]"));
    const nextLayout = {};
    const orderByParent = {};

    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const parentElement = element.parentElement?.closest("[data-gem-id]");
      const parentId = parentElement?.dataset?.gemId ?? "root";
      if (!orderByParent[parentId]) {
        orderByParent[parentId] = [];
      }
      orderByParent[parentId].push(id);
      nextLayout[id] = {
        id,
        parentId,
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || "").trim().slice(0, 140),
        base: {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    });

    Object.entries(orderByParent).forEach(([, ids]) => {
      ids.forEach((id, index) => {
        if (nextLayout[id]) {
          nextLayout[id].order = index;
        }
      });
    });

    setBaseLayout(nextLayout);
    setLayerState((current) => {
      if (Object.keys(current).length) {
        return current;
      }
      const nextLayers = {};
      Object.values(nextLayout).forEach((entry) => {
        const label = entry.text || entry.id;
        nextLayers[entry.id] = {
          id: entry.id,
          name: label.slice(0, 48),
          locked: false,
          hidden: false,
        };
      });
      return nextLayers;
    });
  }, [baseLayout, isIterationMode]);

  useEffect(() => {
    if (!selectedElementIds.length) {
      if (selectedElementId) {
        setSelectedElementId(null);
      }
      return;
    }
    if (!selectedElementIds.includes(selectedElementId)) {
      setSelectedElementId(selectedElementIds[0]);
    }
  }, [selectedElementId, selectedElementIds]);

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const elements = iterationSiteRef.current.querySelectorAll("[data-gem-id]");
    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const layer = layerState[id];
      element.classList.toggle("is-selected", selectedElementIds.includes(id));
      element.classList.toggle("is-highlighted", highlightedIds.includes(id));
      element.classList.toggle("is-layer-hidden", Boolean(layer?.hidden));
      element.classList.toggle("is-layer-locked", Boolean(layer?.locked));
    });
  }, [highlightedIds, isIterationMode, layerState, selectedElementIds]);

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const elements = iterationSiteRef.current.querySelectorAll("[data-gem-id]");
    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const transform = normalizeTransform(elementTransforms[id]);
      element.style.transform = buildTransformString(transform);
    });
  }, [elementTransforms, isIterationMode]);

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const container = iterationSiteRef.current;
    const editedIds = new Set(Object.keys(textEdits));

    Object.entries(textEdits).forEach(([id, entry]) => {
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      if (!element) {
        return;
      }
      if (!textBaseRef.current[id]) {
        const snapshot = getTextSnapshot(element);
        if (snapshot) {
          textBaseRef.current[id] = snapshot;
        }
      }
      const styles = entry?.styles ?? {};
      if (typeof entry?.text === "string") {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.value = entry.text;
        } else {
          element.textContent = entry.text;
        }
      }
      if (styles.fontSize != null) {
        element.style.fontSize = `${styles.fontSize}px`;
      }
      if (styles.lineHeight != null) {
        element.style.lineHeight = `${styles.lineHeight}`;
      }
      if (styles.letterSpacing != null) {
        element.style.letterSpacing = `${styles.letterSpacing}px`;
      }
      if (styles.fontWeight) {
        element.style.fontWeight = styles.fontWeight;
      }
      if (styles.fontFamily) {
        element.style.fontFamily = styles.fontFamily;
      }
      if (styles.textAlign) {
        element.style.textAlign = styles.textAlign;
      }
      if (styles.textTransform) {
        element.style.textTransform = styles.textTransform;
      }
      if (styles.color) {
        element.style.color = styles.color;
      }
    });

    Object.keys(textBaseRef.current).forEach((id) => {
      if (editedIds.has(id)) {
        return;
      }
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      const snapshot = textBaseRef.current[id];
      if (!element || !snapshot) {
        delete textBaseRef.current[id];
        return;
      }
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.value = snapshot.text;
      } else {
        element.textContent = snapshot.text;
      }
      element.style.fontSize = `${snapshot.fontSize}px`;
      element.style.lineHeight = `${snapshot.lineHeight}`;
      element.style.letterSpacing = `${snapshot.letterSpacing}px`;
      element.style.fontWeight = snapshot.fontWeight;
      element.style.fontFamily = snapshot.fontFamily;
      element.style.textAlign = snapshot.textAlign;
      element.style.textTransform = snapshot.textTransform;
      element.style.color = snapshot.color;
      delete textBaseRef.current[id];
    });
  }, [isIterationMode, textEdits]);

  useEffect(() => {
    if (!isIterationMode || iterationTool !== "text") {
      setTextEditDraft(null);
      return;
    }
    if (!iterationSiteRef.current || !selectedElementId) {
      setTextEditDraft(null);
      return;
    }
    const element = iterationSiteRef.current.querySelector(
      `[data-gem-id="${selectedElementId}"]`
    );
    const editable = getEditableTextElement(element);
    if (!editable) {
      setTextEditDraft(null);
      return;
    }
    const snapshot = getTextSnapshot(editable);
    if (!snapshot) {
      setTextEditDraft(null);
      return;
    }
    const overrides = textEdits[selectedElementId];
    setTextEditDraft({
      id: selectedElementId,
      ...snapshot,
      text: overrides?.text ?? snapshot.text,
      ...(overrides?.styles ?? {}),
    });
  }, [isIterationMode, iterationTool, selectedElementId, textEdits]);

  useEffect(() => {
    setDraftCircle(null);
    setIsDrawing(false);
    setIsPencilDrawing(false);
    setPencilPoints([]);
  }, [iterationTool]);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setDraftCircle(null);
    setIsDrawing(false);
    setPendingAnnotation(null);
    setNoteDraft("");
    setIsPencilDrawing(false);
    setPencilPoints([]);
  }, [isIterationMode]);

  const activeTool =
    ITERATION_TOOL_MAP[iterationTool] ??
    ITERATION_TOOL_MAP[DEFAULT_ITERATION_TOOL];
  const selectionMode = activeTool?.selection ?? null;
  const overlayMode = activeTool?.overlay ?? null;
  const isOverlayTool = Boolean(overlayMode);
  const isTextTool = iterationTool === "text";
  const canTransform = isIterationMode && Boolean(activeTool?.transform);
  const canBoxSelect = isIterationMode && selectionMode === "box";

  const stageSize = useMemo(() => {
    if (iterationSize.width && iterationSize.height) {
      return iterationSize;
    }
    return siteBounds;
  }, [iterationSize, siteBounds]);

  const notePosition = useMemo(() => {
    if (!pendingAnnotation) {
      return null;
    }
    const padding = 12;
    const maxLeft = Math.max(
      padding,
      stageSize.width - NOTE_PANEL_SIZE.width - padding
    );
    const maxTop = Math.max(
      padding,
      stageSize.height - NOTE_PANEL_SIZE.height - padding
    );
    const left = clampValue(
      pendingAnnotation.x + pendingAnnotation.radius + padding,
      padding,
      maxLeft
    );
    const top = clampValue(
      pendingAnnotation.y - pendingAnnotation.radius,
      padding,
      maxTop
    );
    return { left, top };
  }, [pendingAnnotation, stageSize]);

  const getLayerMeta = (id) => {
    if (layerState[id]) {
      return layerState[id];
    }
    const fallback = baseLayout[id];
    const label = fallback?.text || id;
    return {
      id,
      name: label?.slice(0, 48) || id,
      locked: false,
      hidden: false,
    };
  };

  const isLayerLocked = (id) => getLayerMeta(id).locked;
  const isLayerHidden = (id) => getLayerMeta(id).hidden;

  const getTransformState = (id) => {
    if (!id) {
      return DEFAULT_TRANSFORM;
    }
    return normalizeTransform(elementTransforms[id]);
  };

  const moveTargets = useMemo(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return [];
    }
    return selectedElementIds
      .map((id) =>
        iterationSiteRef.current.querySelector(`[data-gem-id="${id}"]`)
      )
      .filter(Boolean)
      .filter((element) => {
        const id = element.dataset?.gemId;
        if (!id) {
          return false;
        }
        if (isLayerHidden(id) || isLayerLocked(id)) {
          return false;
        }
        return true;
      });
  }, [isIterationMode, iterationSize, selectedElementIds, layerState]);

  const layerEntries = useMemo(() => {
    return Object.values(baseLayout)
      .map((entry) => ({
        id: entry.id,
        order: entry.order ?? 0,
        parentId: entry.parentId,
        layer: getLayerMeta(entry.id),
      }))
      .sort((a, b) => a.order - b.order);
  }, [baseLayout, layerState]);

  const iterationPatch = useMemo(() => {
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
      },
      highlights: highlightedIds,
      selection: selectedElementIds,
      annotations: annotationsSnapshot,
      textEdits: textEditsSnapshot,
      layoutHints,
    };
  }, [
    annotations,
    baseLayout,
    elementTransforms,
    highlightedIds,
    isIterationMode,
    iterationTool,
    layerState,
    selectedElementIds,
    selectedPreviewIndex,
    siteBounds,
    textEdits,
  ]);

  const updateSelectedElements = (ids) => {
    setSelectedElementIds(ids);
    setSelectedElementId(ids[0] ?? null);
  };

  const ingestFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length) {
      const previews = imageFiles.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return { file, url };
      });
      setGallery((current) => [
        ...previews.map((preview) => preview.url),
        ...current,
      ]);
      setActiveIndex(0);
      const primary = previews[0];
      if (primary) {
        setFileMeta({
          name: primary.file.name,
          size: primary.file.size,
          previewUrl: primary.url,
        });
      }
    }

    files.forEach((file) => {
      const id = `uploads/${file.name}`;
      const language = getLanguageFromFilename(file.name);
      setCustomFiles((current) => {
        if (current.some((entry) => entry.id === id)) {
          return current;
        }
        return [...current, { id, label: file.name, language }];
      });
      setCodeContents((current) => {
        if (current[id]) {
          return current;
        }
        const note = file.type.startsWith("image/")
          ? `/* Uploaded image: ${file.name} */`
          : `/* Uploaded file: ${file.name} */`;
        return { ...current, [id]: note };
      });
    });
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }
    ingestFiles(files);
    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files?.length) {
      ingestFiles(event.dataTransfer.files);
    }
  };

  const handlePrevImage = () => {
    if (!gallery.length) {
      return;
    }
    setActiveIndex((current) =>
      (current - 1 + gallery.length) % gallery.length
    );
  };

  const handleNextImage = () => {
    if (!gallery.length) {
      return;
    }
    setActiveIndex((current) => (current + 1) % gallery.length);
  };

  const handleDeleteImage = () => {
    if (!gallery.length) {
      return;
    }
    const nextGallery = gallery.filter((_, index) => index !== activeIndex);
    setGallery(nextGallery);
    const nextIndex = nextGallery.length
      ? Math.min(activeIndex, nextGallery.length - 1)
      : 0;
    setActiveIndex(nextIndex);
    if (!nextGallery.length) {
      setFileMeta(null);
    }
  };

  const handleSelectPreview = (index) => {
    setSelectedPreviewIndex(index);
    setViewMode("selected");
  };

  const handleIteratePreview = (index) => {
    setSelectedPreviewIndex(index);
    setViewMode("iterate");
  };

  const handleNodeClick = (_, node) => {
    if (!node?.id) {
      return;
    }
    setSelectedNodeId(node.id);
  };

  const handleOpenCodeFile = (file) => {
    if (!file) {
      return;
    }
    setActiveCodeFileId(file.id);
    setOpenCodeTabs((current) => {
      if (current.some((tab) => tab.id === file.id)) {
        return current;
      }
      return [...current, file];
    });
  };

  const handleEditorChange = (value) => {
    setCodeContents((current) => ({
      ...current,
      [activeCodeFileId]: value ?? "",
    }));
  };

  const handleToggleFolder = (key) => {
    setCollapsedFolders((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleAgentSend = () => {
    const trimmed = agentInput.trim();
    if (!trimmed) {
      return;
    }
    setAgentMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "Noted. I will draft the update based on your notes.",
      },
    ]);
    setAgentInput("");
  };

  const updateTextEdits = (id, update) => {
    setTextEdits((current) => {
      const existing = current[id] ?? { text: null, styles: {} };
      const next = {
        ...existing,
        ...update,
        styles: {
          ...existing.styles,
          ...(update.styles ?? {}),
        },
      };
      return { ...current, [id]: next };
    });
  };

  const handleTextContentChange = (value) => {
    if (!textEditDraft?.id) {
      return;
    }
    setTextEditDraft((current) =>
      current ? { ...current, text: value } : current
    );
    updateTextEdits(textEditDraft.id, { text: value });
  };

  const handleTextStyleChange = (key, value) => {
    if (!textEditDraft?.id) {
      return;
    }
    if (typeof value === "number" && Number.isNaN(value)) {
      return;
    }
    setTextEditDraft((current) =>
      current ? { ...current, [key]: value } : current
    );
    updateTextEdits(textEditDraft.id, { styles: { [key]: value } });
  };

  const handleResetTextEdit = () => {
    if (!textEditDraft?.id) {
      return;
    }
    setTextEdits((current) => {
      const next = { ...current };
      delete next[textEditDraft.id];
      return next;
    });
    setTextEditDraft(null);
  };

  const handleOverlayPointerDown = (event) => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const point = getPointerFromEvent(event, bounds);
    if (!point) {
      return;
    }
    if (overlayMode === "note") {
      setIsDrawing(true);
      setDraftCircle({
        x: point.x,
        y: point.y,
        radius: 0,
        startX: point.x,
        startY: point.y,
      });
      setPendingAnnotation(null);
      setNoteDraft("");
      return;
    }
    if (overlayMode === "pencil") {
      setIsPencilDrawing(true);
      setPencilPoints([point.x, point.y]);
    }
  };

  const handleOverlayPointerMove = (event) => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const point = getPointerFromEvent(event, bounds);
    if (!point) {
      return;
    }
    if (overlayMode === "note") {
      if (!isDrawing || !draftCircle) {
        return;
      }
      const radius = Math.hypot(
        point.x - draftCircle.startX,
        point.y - draftCircle.startY
      );
      setDraftCircle((current) =>
        current
          ? {
              ...current,
              radius,
            }
          : current
      );
      return;
    }
    if (overlayMode === "pencil") {
      if (!isPencilDrawing) {
        return;
      }
      setPencilPoints((current) => {
        if (current.length < 2) {
          return [point.x, point.y];
        }
        const lastX = current[current.length - 2];
        const lastY = current[current.length - 1];
        const distance = Math.hypot(point.x - lastX, point.y - lastY);
        if (distance < 3) {
          return current;
        }
        return [...current, point.x, point.y];
      });
    }
  };

  const handleOverlayPointerEnd = () => {
    if (!isIterationMode || !overlayMode) {
      return;
    }
    if (overlayMode === "note") {
      if (!isDrawing || !draftCircle) {
        setIsDrawing(false);
        setDraftCircle(null);
        return;
      }
      const radius = Math.max(draftCircle.radius, NOTE_RADIUS_MIN);
      if (!radius) {
        setIsDrawing(false);
        setDraftCircle(null);
        return;
      }
      const nextAnnotation = {
        id: `note-${Date.now()}`,
        x: draftCircle.x,
        y: draftCircle.y,
        radius,
        note: "",
      };
      setAnnotations((current) => [...current, nextAnnotation]);
      setPendingAnnotation(nextAnnotation);
      setNoteDraft("");
      setDraftCircle(null);
      setIsDrawing(false);
      return;
    }
    if (overlayMode === "pencil") {
      if (!isPencilDrawing) {
        return;
      }
      setIsPencilDrawing(false);
      const points = pencilPoints;
      setPencilPoints([]);
      if (points.length < 6) {
        return;
      }
      const polygon = [];
      for (let i = 0; i < points.length; i += 2) {
        polygon.push({ x: points[i], y: points[i + 1] });
      }
      const entries = Object.values(baseLayout);
      if (!entries.length) {
        return;
      }
      const selected = entries
        .filter((entry) => {
          const transform = normalizeTransform(elementTransforms[entry.id]);
          const center = {
            x: entry.base.x + transform.x + (entry.base.width * transform.scaleX) / 2,
            y: entry.base.y + transform.y + (entry.base.height * transform.scaleY) / 2,
          };
          return isPointInPolygon(center, polygon);
        })
        .map((entry) => entry.id)
        .filter((id) => !isLayerHidden(id));
      updateSelectedElements(selected);
    }
  };

  const handleSaveNote = () => {
    if (!pendingAnnotation) {
      return;
    }
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === pendingAnnotation.id
          ? { ...annotation, note: noteDraft.trim() }
          : annotation
      )
    );
    setPendingAnnotation(null);
    setNoteDraft("");
  };

  const handleCancelNote = () => {
    if (!pendingAnnotation) {
      return;
    }
    setAnnotations((current) =>
      current.filter((annotation) => annotation.id !== pendingAnnotation.id)
    );
    setPendingAnnotation(null);
    setNoteDraft("");
  };

  const handleSelectElement = (event) => {
    if (!isIterationMode) {
      return;
    }
    if (!ITERATION_SELECTION_TOOLS.includes(selectionMode)) {
      return;
    }
    if (selectionMode !== "box") {
      return;
    }
    const target = event.target?.closest?.("[data-gem-id]");
    if (!target) {
      if (!event.shiftKey) {
        updateSelectedElements([]);
      }
      return;
    }
    const id = target.dataset?.gemId;
    if (!id || isLayerHidden(id)) {
      return;
    }
    if (event.shiftKey) {
      setSelectedElementIds((current) => {
        const exists = current.includes(id);
        const next = exists
          ? current.filter((entry) => entry !== id)
          : [...current, id];
        setSelectedElementId(next[0] ?? null);
        return next;
      });
      return;
    }
    updateSelectedElements([id]);
  };

  const handleToggleHighlight = () => {
    if (!selectedElementId) {
      return;
    }
    setHighlightedIds((current) =>
      current.includes(selectedElementId)
        ? current.filter((id) => id !== selectedElementId)
        : [...current, selectedElementId]
    );
  };

  const updateElementTransform = (id, nextTransform, target) => {
    if (!id) {
      return;
    }
    setElementTransforms((current) => {
      const base = normalizeTransform(current[id]);
      const merged = { ...base, ...nextTransform };
      if (target) {
        target.style.transform = buildTransformString(merged);
      }
      return { ...current, [id]: merged };
    });
  };

  const handleSelectoEnd = (event) => {
    const selected = (event.selected ?? [])
      .map((element) => element.dataset?.gemId)
      .filter(Boolean)
      .filter((id) => !isLayerHidden(id));
    updateSelectedElements(selected);
  };

  const handleToggleLayerVisibility = (id) => {
    setLayerState((current) => {
      const layer = current[id] ?? { id, name: id, locked: false, hidden: false };
      const nextLayer = { ...layer, hidden: !layer.hidden };
      const next = { ...current, [id]: nextLayer };
      if (nextLayer.hidden) {
        setSelectedElementIds((currentSelection) =>
          currentSelection.filter((entry) => entry !== id)
        );
        setHighlightedIds((currentHighlights) =>
          currentHighlights.filter((entry) => entry !== id)
        );
      }
      return next;
    });
  };

  const handleToggleLayerLock = (id) => {
    setLayerState((current) => {
      const layer = current[id] ?? { id, name: id, locked: false, hidden: false };
      return { ...current, [id]: { ...layer, locked: !layer.locked } };
    });
  };

  return {
    state: {
      fileMeta,
      isDragging,
      gallery,
      activeIndex,
      viewMode,
      previewCount,
      selectedPreviewIndex,
      speedValue,
      title,
      name,
      details,
      customFiles,
      activeCodeFileId,
      openCodeTabs,
      codePanelMode,
      collapsedFolders,
      codeContents,
      agentInput,
      agentMessages,
      iterationTool,
      showTransformControls,
      showLayers,
      isDrawing,
      draftCircle,
      pendingAnnotation,
      noteDraft,
      annotations,
      iterationSize,
      siteBounds,
      selectedElementId,
      selectedElementIds,
      elementTransforms,
      textEdits,
      textEditDraft,
      layerState,
      highlightedIds,
      baseLayout,
      showPatch,
      pencilPoints,
      isPencilDrawing,
      selectedNodeId,
      nodes,
      edges,
    },
    derived: {
      hasFile,
      dropTitle,
      dropMeta,
      fileSizeLabel,
      activePreview,
      codeFileGroups,
      codeTreeGroups,
      activeCodeFile,
      activeCodeLanguage,
      activeCodeContent,
      isPreviewMode,
      isIterationMode,
      selectedNodeLabel,
      qualityValue,
      overlayMode,
      isOverlayTool,
      isTextTool,
      canTransform,
      canBoxSelect,
      stageSize,
      notePosition,
      moveTargets,
      layerEntries,
      iterationPatch,
    },
    refs: {
      iterationRef,
      iterationPreviewRef,
      iterationSiteRef,
    },
    actions: {
      setActiveIndex,
      setPreviewCount,
      setSpeedValue,
      setTitle,
      setName,
      setDetails,
      setViewMode,
      setSelectedPreviewIndex,
      setCodePanelMode,
      setAgentInput,
      setIterationTool,
      setShowTransformControls,
      setShowLayers,
      setShowPatch,
      setNoteDraft,
      setSelectedElementId,
      setSelectedElementIds,
      onNodesChange,
      onEdgesChange,
      handleFileChange,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handlePrevImage,
      handleNextImage,
      handleDeleteImage,
      handleSelectPreview,
      handleIteratePreview,
      handleNodeClick,
      handleOpenCodeFile,
      handleEditorChange,
      handleToggleFolder,
      handleAgentSend,
      handleTextContentChange,
      handleTextStyleChange,
      handleResetTextEdit,
      handleOverlayPointerDown,
      handleOverlayPointerMove,
      handleOverlayPointerEnd,
      handleSaveNote,
      handleCancelNote,
      handleSelectElement,
      handleToggleHighlight,
      updateElementTransform,
      handleSelectoEnd,
      handleToggleLayerVisibility,
      handleToggleLayerLock,
      getTransformState,
    },
  };
}
