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
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;
const HISTORY_LIMIT = 60;
const HISTORY_DEBOUNCE_MS = 320;
const NUDGE_STEP = 1;
const NUDGE_STEP_LARGE = 10;
const GUIDE_COLORS = ["#f97316", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b"];
const VIEW_MODE_HASHES = new Set([
  "start",
  "nodes",
  "preview",
  "selected",
  "iterate",
  "code",
]);

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

const isEditableTarget = (target) => {
  if (!target || !target.closest) {
    return false;
  }
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable=''], [contenteditable='true']"
    )
  );
};

const getPointerFromEvent = (
  event,
  bounds,
  panOffset = { x: 0, y: 0 },
  zoomLevel = 1
) => {
  const clientX = event?.evt?.clientX ?? event?.clientX;
  const clientY = event?.evt?.clientY ?? event?.clientY;
  if (clientX == null || clientY == null || !bounds) {
    return null;
  }
  return {
    x: (clientX - bounds.left - panOffset.x) / zoomLevel,
    y: (clientY - bounds.top - panOffset.y) / zoomLevel,
  };
};

const getTopLevelSelection = (ids, layout) => {
  if (!ids?.length || !layout) {
    return ids ?? [];
  }
  const selected = new Set(ids);
  return ids.filter((id) => {
    let parentId = layout[id]?.parentId;
    while (parentId && parentId !== "root") {
      if (selected.has(parentId)) {
        return false;
      }
      parentId = layout[parentId]?.parentId;
    }
    return true;
  });
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

const toKebabCase = (value) => {
  if (!value) {
    return "node";
  }
  const normalized = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 30) || "node";
};

const ensureUniqueId = (base, used) => {
  let next = base;
  let index = 1;
  while (used.has(next)) {
    next = `${base}-${index}`;
    index += 1;
  }
  used.add(next);
  return next;
};

const normalizeRequirements = (requirements) => {
  if (Array.isArray(requirements)) {
    return requirements
      .map((item) => (item == null ? "" : item.toString()).trim())
      .filter(Boolean);
  }
  if (requirements == null) {
    return [];
  }
  const text = requirements.toString().trim();
  return text ? [text] : [];
};

const toNodeSnapshot = (node) => {
  if (!node) {
    return null;
  }
  const data = node.data ?? node;
  return {
    id: node.id?.toString() ?? "",
    label: data.label?.toString() ?? "",
    description: data.description?.toString() ?? "",
    requirements: normalizeRequirements(data.requirements),
    kind: data.kind?.toString() ?? "",
  };
};

const buildNodeContext = (nodeId, nodes, edges) => {
  if (!nodeId || !Array.isArray(nodes)) {
    return { node: null, parent: null, children: [], path: [] };
  }
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const getNode = (id) => toNodeSnapshot(nodeMap.get(id));
  const parentEdge = edges?.find((edge) => edge.target === nodeId);
  const parent = parentEdge ? getNode(parentEdge.source) : null;
  const children = (edges ?? [])
    .filter((edge) => edge.source === nodeId)
    .map((edge) => getNode(edge.target))
    .filter(Boolean);
  const path = [];
  let currentId = nodeId;
  const seen = new Set();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const entry = getNode(currentId);
    if (!entry) {
      break;
    }
    path.unshift(entry);
    const nextEdge = (edges ?? []).find((edge) => edge.target === currentId);
    currentId = nextEdge?.source ?? null;
  }
  return {
    node: getNode(nodeId),
    parent,
    children,
    path,
  };
};

const normalizeStructureTree = (input) => {
  if (!input || typeof input !== "object") {
    return null;
  }
  if (input.root) {
    return input.root;
  }
  if (input.tree) {
    return input.tree;
  }
  if (Array.isArray(input.pages)) {
    return {
      id: "root",
      label: "App",
      children: input.pages,
    };
  }
  if (Array.isArray(input)) {
    return {
      id: "root",
      label: "App",
      children: input,
    };
  }
  return input;
};

const getTreeChildren = (node) => {
  if (!node || typeof node !== "object") {
    return [];
  }
  if (Array.isArray(node.children)) {
    return node.children;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.pages)) {
    return node.pages;
  }
  if (Array.isArray(node.nodes)) {
    return node.nodes;
  }
  return [];
};

const buildFlowFromTree = (inputTree) => {
  const root = normalizeStructureTree(inputTree);
  if (!root) {
    return null;
  }
  const nodes = [];
  const edges = [];
  const depthCounts = new Map();
  const usedIds = new Set();

  const walk = (node, depth = 0, parentId = null) => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (depth === 0) {
      getTreeChildren(node).forEach((child) => walk(child, depth + 1, null));
      return;
    }
    const label =
      node.label?.toString() ||
      node.name?.toString() ||
      node.title?.toString() ||
      node.id?.toString() ||
      "Untitled";
    const baseId = toKebabCase(node.id || label);
    const id = ensureUniqueId(baseId, usedIds);
    const order = depthCounts.get(depth) ?? 0;
    depthCounts.set(depth, order + 1);
    const layoutDepth = Math.max(depth - 1, 0);
    const description = node.description?.toString() ?? "";
    const requirements = normalizeRequirements(node.requirements);
    nodes.push({
      id,
      data: {
        label,
        depth,
        kind: depth === 1 ? "page" : "component",
        description,
        requirements,
        sourceId: node.id?.toString() ?? id,
      },
      position: { x: layoutDepth * 240, y: order * 120 },
      type: "default",
    });
    if (parentId) {
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
      });
    }
    getTreeChildren(node).forEach((child) => walk(child, depth + 1, id));
  };

  walk(root, 0, null);
  return { nodes, edges };
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
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState("start");
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [modelQuality, setModelQuality] = useState("flash");
  const [creativityValue, setCreativityValue] = useState(45);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [showComponents, setShowComponents] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [structureTree, setStructureTree] = useState(null);
  const [structureFlow, setStructureFlow] = useState(null);
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
  const previewRequestRef = useRef(0);
  const iterationRef = useRef(null);
  const iterationPreviewRef = useRef(null);
  const iterationSiteRef = useRef(null);
  const textBaseRef = useRef({});
  const panStartRef = useRef(null);
  const historyLockRef = useRef(false);
  const historyLabelRef = useRef("Edit");
  const historyTimerRef = useRef(null);
  const guideColorIndexRef = useRef(0);
  const hashSyncRef = useRef({
    lastWritten: "",
    isApplying: false,
    initialized: false,
  });
  const [iterationTool, setIterationTool] = useState(DEFAULT_ITERATION_TOOL);
  const [showTransformControls, setShowTransformControls] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [gridSize, setGridSize] = useState(24);
  const [guides, setGuides] = useState(() => []);
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
  const [zoomState, setZoomState] = useState(() => ({
    zoom: 1,
    pan: { x: 0, y: 0 },
  }));
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [textEdits, setTextEdits] = useState(() => ({}));
  const [textEditDraft, setTextEditDraft] = useState(null);
  const [layerState, setLayerState] = useState(() => ({}));
  const [layerFolders, setLayerFolders] = useState(() => ({}));
  const [layerFolderOrder, setLayerFolderOrder] = useState(() => []);
  const [deletedLayerIds, setDeletedLayerIds] = useState(() => []);
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
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [historyState, setHistoryState] = useState(() => ({
    past: [],
    present: null,
    future: [],
  }));

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
  const activeImageFile = galleryFiles[activeIndex] ?? null;
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
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  useEffect(() => {
    if (!nodes.length) {
      if (selectedNodeId) {
        setSelectedNodeId(null);
      }
      return;
    }
    const exists = nodes.some((node) => node.id === selectedNodeId);
    if (!exists) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedNodeLabel = selectedNode?.data?.label ?? "Unknown";
  const selectedNodeDescription = selectedNode?.data?.description ?? "";
  const selectedNodeRequirements = selectedNode?.data?.requirements ?? [];
  const qualityLabel = modelQuality === "pro" ? "Pro" : "Flash";
  const qualityIndex = modelQuality === "pro" ? 1 : 0;

  const visibleFlow = useMemo(() => {
    if (!structureFlow) {
      return null;
    }
    if (showComponents) {
      return structureFlow;
    }
    const pageNodes = structureFlow.nodes.filter(
      (node) => node.data?.kind === "page"
    );
    const pageIds = new Set(pageNodes.map((node) => node.id));
    const pageEdges = structureFlow.edges.filter(
      (edge) => pageIds.has(edge.source) && pageIds.has(edge.target)
    );
    return { nodes: pageNodes, edges: pageEdges };
  }, [showComponents, structureFlow]);

  useEffect(() => {
    if (!visibleFlow) {
      return;
    }
    setNodes(visibleFlow.nodes);
    setEdges(visibleFlow.edges);
    setSelectedNodeId((current) => {
      if (visibleFlow.nodes.some((node) => node.id === current)) {
        return current;
      }
      return visibleFlow.nodes[0]?.id ?? null;
    });
  }, [setEdges, setNodes, visibleFlow]);

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
    if (typeof window === "undefined") {
      return;
    }
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!VIEW_MODE_HASHES.has(hash) || hash === viewMode) {
        return;
      }
      hashSyncRef.current.isApplying = true;
      setViewMode(hash);
    };
    if (!hashSyncRef.current.initialized) {
      hashSyncRef.current.initialized = true;
      applyHash();
    }
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
    };
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!VIEW_MODE_HASHES.has(viewMode)) {
      return;
    }
    if (hashSyncRef.current.isApplying) {
      hashSyncRef.current.isApplying = false;
      return;
    }
    const nextHash = `#${viewMode}`;
    if (hashSyncRef.current.lastWritten === nextHash) {
      return;
    }
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    hashSyncRef.current.lastWritten = nextHash;
  }, [viewMode]);

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
      element.classList.toggle("is-layer-deleted", isLayerDeleted(id));
    });
  }, [
    deletedLayerIds,
    highlightedIds,
    isIterationMode,
    layerState,
    selectedElementIds,
  ]);

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
    setShowTextPanel(true);
  }, [isIterationMode]);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setZoomState({ zoom: 1, pan: { x: 0, y: 0 } });
    setIsPanning(false);
    setIsSpacePanning(false);
    panStartRef.current = null;
    setLayerFolders({});
    setLayerFolderOrder([]);
  }, [isIterationMode]);

  useEffect(() => {
    if (!Object.keys(baseLayout).length) {
      return;
    }
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (id) => baseLayout[id]
        );
        if (filtered.length !== (folder.layerIds ?? []).length) {
          changed = true;
        }
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      return changed ? next : current;
    });
  }, [baseLayout]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== "Space") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      setIsSpacePanning(true);
    };
    const handleKeyUp = (event) => {
      if (event.code !== "Space") {
        return;
      }
      setIsSpacePanning(false);
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const activeTool =
    ITERATION_TOOL_MAP[iterationTool] ??
    ITERATION_TOOL_MAP[DEFAULT_ITERATION_TOOL];
  const selectionMode = activeTool?.selection ?? null;
  const overlayMode = activeTool?.overlay ?? null;
  const isOverlayTool = Boolean(overlayMode);
  const isTextTool = iterationTool === "text";
  const isZoomTool = iterationTool === "zoom";
  const isPanTool = iterationTool === "pan";
  const zoomLevel = zoomState.zoom;
  const panOffset = zoomState.pan;
  const isPanMode = isSpacePanning || isPanTool;
  const canTransform = isIterationMode && Boolean(activeTool?.transform);
  const canBoxSelect = isIterationMode && selectionMode === "box";

  const stageSize = useMemo(() => {
    if (iterationSize.width && iterationSize.height) {
      return iterationSize;
    }
    return siteBounds;
  }, [iterationSize, siteBounds]);

  const verticalGuides = useMemo(
    () =>
      guides
        .filter((guide) => guide.axis === "vertical")
        .map((guide) => guide.position),
    [guides]
  );

  const horizontalGuides = useMemo(
    () =>
      guides
        .filter((guide) => guide.axis === "horizontal")
        .map((guide) => guide.position),
    [guides]
  );

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
    const scaledRadius = pendingAnnotation.radius * zoomLevel;
    const screenX = pendingAnnotation.x * zoomLevel + panOffset.x;
    const screenY = pendingAnnotation.y * zoomLevel + panOffset.y;
    const left = clampValue(
      screenX + scaledRadius + padding,
      padding,
      maxLeft
    );
    const top = clampValue(
      screenY - scaledRadius,
      padding,
      maxTop
    );
    return { left, top };
  }, [panOffset, pendingAnnotation, stageSize, zoomLevel]);

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

  const deletedLayerSet = useMemo(
    () => new Set(deletedLayerIds),
    [deletedLayerIds]
  );

  const isLayerLocked = (id) => getLayerMeta(id).locked;
  const isLayerHidden = (id) => getLayerMeta(id).hidden;
  const isLayerDeleted = (id) => deletedLayerSet.has(id);

  const getTransformState = (id) => {
    if (!id) {
      return DEFAULT_TRANSFORM;
    }
    return normalizeTransform(elementTransforms[id]);
  };

  const moveTargetIds = useMemo(() => {
    return getTopLevelSelection(selectedElementIds, baseLayout);
  }, [baseLayout, selectedElementIds]);

  const moveTargets = useMemo(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return [];
    }
    return moveTargetIds
      .map((id) =>
        iterationSiteRef.current.querySelector(`[data-gem-id="${id}"]`)
      )
      .filter(Boolean)
      .filter((element) => {
        const id = element.dataset?.gemId;
        if (!id) {
          return false;
        }
        if (isLayerHidden(id) || isLayerLocked(id) || isLayerDeleted(id)) {
          return false;
        }
        return true;
      });
  }, [
    deletedLayerIds,
    isIterationMode,
    iterationSize,
    layerState,
    moveTargetIds,
  ]);

  const layerEntries = useMemo(() => {
    return Object.values(baseLayout)
      .filter((entry) => !isLayerDeleted(entry.id))
      .map((entry) => ({
        id: entry.id,
        order: entry.order ?? 0,
        parentId: entry.parentId,
        layer: getLayerMeta(entry.id),
      }))
      .sort((a, b) => a.order - b.order);
  }, [baseLayout, deletedLayerIds, layerState]);

  const { layerFolderEntries, ungroupedLayerEntries } = useMemo(() => {
    const entryMap = {};
    layerEntries.forEach((entry) => {
      entryMap[entry.id] = entry;
    });
    const groupedIds = new Set();
    const folders = layerFolderOrder
      .map((id, index) => {
        const folder = layerFolders[id];
        if (!folder) {
          return null;
        }
        const layers = (folder.layerIds ?? [])
          .map((layerId) => entryMap[layerId])
          .filter(Boolean);
        layers.forEach((layer) => groupedIds.add(layer.id));
        const allHidden =
          layers.length > 0 && layers.every((layer) => layer.layer.hidden);
        const allLocked =
          layers.length > 0 && layers.every((layer) => layer.layer.locked);
        return {
          id: folder.id,
          name: folder.name,
          collapsed: Boolean(folder.collapsed),
          layers,
          hidden: allHidden,
          locked: allLocked,
          order: folder.order ?? index,
        };
      })
      .filter(Boolean);

    const ungrouped = layerEntries.filter((entry) => !groupedIds.has(entry.id));
    return { layerFolderEntries: folders, ungroupedLayerEntries: ungrouped };
  }, [layerEntries, layerFolderOrder, layerFolders]);

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
  }, [
    annotations,
    baseLayout,
    deletedLayerIds,
    elementTransforms,
    highlightedIds,
    isIterationMode,
    iterationTool,
    layerFolderOrder,
    layerFolders,
    layerState,
    selectedElementIds,
    selectedPreviewIndex,
    siteBounds,
    textEdits,
  ]);

  const getHistorySignature = (snapshot) => JSON.stringify(snapshot);

  const cloneHistorySnapshot = (snapshot) => {
    if (typeof structuredClone === "function") {
      return structuredClone(snapshot);
    }
    return JSON.parse(JSON.stringify(snapshot));
  };

  const buildHistorySnapshot = () => ({
    elementTransforms,
    textEdits,
    annotations,
    layerState,
    layerFolders,
    layerFolderOrder,
    deletedLayerIds,
    highlightedIds,
  });

  const applyHistorySnapshot = (snapshot) => {
    setElementTransforms(snapshot?.elementTransforms ?? {});
    setTextEdits(snapshot?.textEdits ?? {});
    setAnnotations(snapshot?.annotations ?? []);
    setLayerState(snapshot?.layerState ?? {});
    setLayerFolders(snapshot?.layerFolders ?? {});
    setLayerFolderOrder(snapshot?.layerFolderOrder ?? []);
    setDeletedLayerIds(snapshot?.deletedLayerIds ?? []);
    setHighlightedIds(snapshot?.highlightedIds ?? []);
    updateSelectedElements([]);
  };

  const commitHistory = (label = "Edit") => {
    if (!isIterationMode || historyLockRef.current) {
      return;
    }
    const snapshot = buildHistorySnapshot();
    const signature = getHistorySignature(snapshot);
    setHistoryState((current) => {
      if (current.present?.signature === signature) {
        return current;
      }
      const entry = {
        id: `history-${Date.now()}`,
        label,
        timestamp: new Date().toISOString(),
        snapshot: cloneHistorySnapshot(snapshot),
        signature,
      };
      const nextPast = current.present
        ? [...current.past, current.present]
        : current.past;
      const trimmedPast = nextPast.slice(-HISTORY_LIMIT);
      return {
        past: trimmedPast,
        present: entry,
        future: [],
      };
    });
  };

  const scheduleHistoryCommit = (label) => {
    if (!isIterationMode || historyLockRef.current) {
      return;
    }
    if (label) {
      historyLabelRef.current = label;
    }
    const nextLabel = historyLabelRef.current || "Edit";
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = setTimeout(() => {
      commitHistory(nextLabel);
      historyLabelRef.current = "Edit";
    }, HISTORY_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!isIterationMode || !Object.keys(baseLayout).length) {
      return;
    }
    scheduleHistoryCommit();
    return () => {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
    };
  }, [
    annotations,
    baseLayout,
    deletedLayerIds,
    elementTransforms,
    highlightedIds,
    isIterationMode,
    layerFolderOrder,
    layerFolders,
    layerState,
    textEdits,
  ]);

  useEffect(() => {
    if (!isIterationMode) {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      historyLockRef.current = false;
      historyLabelRef.current = "Edit";
      setHistoryState({ past: [], present: null, future: [] });
    }
  }, [isIterationMode]);

  const historyEntries = useMemo(() => {
    const entries = [...historyState.past];
    if (historyState.present) {
      entries.push(historyState.present);
    }
    return entries;
  }, [historyState]);

  const activeHistoryId = historyState.present?.id ?? null;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const updateSelectedElements = (ids) => {
    const nextIds = (ids ?? []).filter((id) => !isLayerDeleted(id));
    setSelectedElementIds(nextIds);
    setSelectedElementId(nextIds[0] ?? null);
  };

  const handleUndoHistory = () => {
    let snapshotToApply = null;
    setHistoryState((current) => {
      if (!current.present || !current.past.length) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      snapshotToApply = previous.snapshot;
      const nextPast = current.past.slice(0, -1);
      return {
        past: nextPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    if (snapshotToApply) {
      historyLockRef.current = true;
      applyHistorySnapshot(snapshotToApply);
      queueMicrotask(() => {
        historyLockRef.current = false;
      });
    }
  };

  const handleRedoHistory = () => {
    let snapshotToApply = null;
    setHistoryState((current) => {
      if (!current.present || !current.future.length) {
        return current;
      }
      const nextEntry = current.future[0];
      snapshotToApply = nextEntry.snapshot;
      const nextPast = [...current.past, current.present].slice(-HISTORY_LIMIT);
      return {
        past: nextPast,
        present: nextEntry,
        future: current.future.slice(1),
      };
    });
    if (snapshotToApply) {
      historyLockRef.current = true;
      applyHistorySnapshot(snapshotToApply);
      queueMicrotask(() => {
        historyLockRef.current = false;
      });
    }
  };

  const handleClearHistory = () => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
    }
    setHistoryState({ past: [], present: null, future: [] });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndoHistory();
        return;
      }
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        handleRedoHistory();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        handleRedoHistory();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedoHistory, handleUndoHistory, isIterationMode]);

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
      setGalleryFiles((current) => [
        ...previews.map((preview) => preview.file),
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
    const nextGalleryFiles = galleryFiles.filter(
      (_, index) => index !== activeIndex
    );
    setGallery(nextGallery);
    setGalleryFiles(nextGalleryFiles);
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

  const handleGeneratePreviews = async () => {
    if (isGeneratingPreviews) {
      return;
    }
    setPreviewError("");
    if (!structureFlow || !selectedNodeId) {
      setPreviewError("Generate a structure and select a node first.");
      return;
    }
    const nodeContext = buildNodeContext(selectedNodeId, nodes, edges);
    if (!nodeContext?.node) {
      setPreviewError("Selected node not found.");
      return;
    }

    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    const count = clampValue(previewCount, 1, 6);
    setSelectedPreviewIndex(0);
    setViewMode("preview");
    setIsGeneratingPreviews(true);
    setPreviewItems(
      Array.from({ length: count }, (_, index) => ({
        id: `preview-${requestId}-${index}`,
        status: "loading",
        imageUrl: null,
        plan: null,
      }))
    );

    try {
      const response = await fetch("/api/previews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count,
          quality: modelQuality,
          creativity: creativityValue,
          nodeContext,
          title,
          name,
          details,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate previews.");
      }
      if (previewRequestRef.current !== requestId) {
        return;
      }
      const previews = Array.isArray(payload?.previews) ? payload.previews : [];
      setPreviewItems(
        Array.from({ length: count }, (_, index) => {
          const preview = previews[index];
          if (!preview) {
            return {
              id: `preview-${requestId}-${index}`,
              status: "empty",
              imageUrl: null,
              plan: null,
            };
          }
          return {
            ...preview,
            status: preview.imageUrl ? "ready" : "empty",
          };
        })
      );
    } catch (error) {
      if (previewRequestRef.current !== requestId) {
        return;
      }
      setPreviewError(error?.message ?? "Failed to generate previews.");
      setPreviewItems([]);
    } finally {
      if (previewRequestRef.current === requestId) {
        setIsGeneratingPreviews(false);
      }
    }
  };

  const handleGenerateStructure = async () => {
    if (isGeneratingStructure) {
      return;
    }
    setGenerationError("");
    if (!activeImageFile) {
      setGenerationError("Upload an image before generating the structure.");
      return;
    }
    setIsGeneratingStructure(true);
    try {
      const formData = new FormData();
      formData.append("image", activeImageFile, activeImageFile.name);
      formData.append("title", title);
      formData.append("name", name);
      formData.append("details", details);

      const response = await fetch("/api/structure", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate structure.");
      }

      const tree = payload?.tree ?? payload?.structure ?? payload?.root ?? payload;
      const flow = buildFlowFromTree(tree);
      if (!flow) {
        throw new Error("No structure tree returned.");
      }
      setStructureFlow(flow);
      setStructureTree(tree);
      setShowComponents(false);
      setViewMode("nodes");
    } catch (error) {
      setGenerationError(error?.message ?? "Failed to generate structure.");
    } finally {
      setIsGeneratingStructure(false);
    }
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

  const getPreviewPoint = (event) => {
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    const clientX = event?.clientX ?? event?.evt?.clientX;
    const clientY = event?.clientY ?? event?.evt?.clientY;
    if (!bounds || clientX == null || clientY == null) {
      return null;
    }
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  };

  const getPreviewCenter = () => {
    const bounds = iterationPreviewRef.current?.getBoundingClientRect();
    if (!bounds) {
      return null;
    }
    return {
      x: bounds.width / 2,
      y: bounds.height / 2,
    };
  };

  const applyZoom = (point, direction) => {
    if (!point) {
      return;
    }
    setZoomState((current) => {
      const nextZoom = clampValue(
        current.zoom + direction * ZOOM_STEP,
        ZOOM_MIN,
        ZOOM_MAX
      );
      if (nextZoom === current.zoom) {
        return current;
      }
      const contentX = (point.x - current.pan.x) / current.zoom;
      const contentY = (point.y - current.pan.y) / current.zoom;
      return {
        zoom: nextZoom,
        pan: {
          x: point.x - contentX * nextZoom,
          y: point.y - contentY * nextZoom,
        },
      };
    });
  };

  const handleZoomPointer = (event) => {
    if (!isIterationMode || !isZoomTool) {
      return;
    }
    if (isSpacePanning) {
      return;
    }
    if (event.button != null && event.button !== 0) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    const direction = event.altKey ? -1 : 1;
    applyZoom(point, direction);
  };

  const handleZoomWheel = (event) => {
    if (!isIterationMode) {
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    applyZoom(point, direction);
  };

  const handlePanPointerDown = (event) => {
    if (!isIterationMode) {
      return;
    }
    const allowPan = isSpacePanning || isPanTool || event.button === 1;
    if (!allowPan) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    event.preventDefault();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    panStartRef.current = {
      x: point.x,
      y: point.y,
      panX: zoomState.pan.x,
      panY: zoomState.pan.y,
    };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isIterationMode) {
      return;
    }
    const element = iterationPreviewRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [isIterationMode]);

  const handlePanPointerMove = (event) => {
    const start = panStartRef.current;
    if (!start) {
      return;
    }
    const point = getPreviewPoint(event);
    if (!point) {
      return;
    }
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;
    setZoomState((current) => ({
      ...current,
      pan: {
        x: start.panX + deltaX,
        y: start.panY + deltaY,
      },
    }));
  };

  const handlePanPointerEnd = (event) => {
    if (!panStartRef.current) {
      return;
    }
    panStartRef.current = null;
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    setIsPanning(false);
  };

  const getNextGuideColor = () => {
    const index = guideColorIndexRef.current;
    guideColorIndexRef.current = (index + 1) % GUIDE_COLORS.length;
    return GUIDE_COLORS[index] ?? GUIDE_COLORS[0];
  };

  const handleCreateGuide = (axis, position) => {
    const maxSize = axis === "vertical" ? stageSize.width : stageSize.height;
    if (!maxSize) {
      return null;
    }
    const rawPosition = position ?? maxSize / 2;
    const nextPosition = clampValue(roundValue(rawPosition), 0, maxSize);
    const id = `guide-${axis}-${Date.now()}`;
    setGuides((current) => [
      ...current,
      {
        id,
        axis,
        position: nextPosition,
        color: getNextGuideColor(),
      },
    ]);
    setShowGuides(true);
    return id;
  };

  const handleAddGuide = (axis) => {
    handleCreateGuide(axis);
  };

  const handleUpdateGuide = (id, position) => {
    setGuides((current) =>
      current.map((guide) =>
        guide.id === id
          ? {
              ...guide,
              position: clampValue(
                roundValue(position),
                0,
                guide.axis === "vertical" ? stageSize.width : stageSize.height
              ),
              color: guide.color ?? GUIDE_COLORS[0],
            }
          : guide
      )
    );
  };

  const handleRemoveGuide = (id) => {
    setGuides((current) => current.filter((guide) => guide.id !== id));
  };

  const handleClearGuides = () => {
    setGuides([]);
    guideColorIndexRef.current = 0;
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
    scheduleHistoryCommit("Text edit");
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
    scheduleHistoryCommit("Text edit");
    setTextEditDraft((current) =>
      current ? { ...current, [key]: value } : current
    );
    updateTextEdits(textEditDraft.id, { styles: { [key]: value } });
  };

  const handleResetTextEdit = () => {
    if (!textEditDraft?.id) {
      return;
    }
    scheduleHistoryCommit("Text reset");
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
    const point = getPointerFromEvent(event, bounds, panOffset, zoomLevel);
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
    const point = getPointerFromEvent(event, bounds, panOffset, zoomLevel);
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
      scheduleHistoryCommit("Annotation");
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
        .filter((id) => !isLayerHidden(id) && !isLayerDeleted(id));
      updateSelectedElements(selected);
    }
  };

  const handleSaveNote = () => {
    if (!pendingAnnotation) {
      return;
    }
    scheduleHistoryCommit("Annotation");
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
    scheduleHistoryCommit("Annotation");
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
    if (isSpacePanning || isPanning) {
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
    if (!id || isLayerHidden(id) || isLayerDeleted(id)) {
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
    scheduleHistoryCommit("Highlight");
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
    scheduleHistoryCommit("Transform");
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
    if (isSpacePanning || isPanning) {
      return;
    }
    const selected = (event.selected ?? [])
      .map((element) => element.dataset?.gemId)
      .filter(Boolean)
      .filter((id) => !isLayerHidden(id) && !isLayerDeleted(id));
    updateSelectedElements(selected);
  };

  const handleNudgeSelection = (deltaX, deltaY) => {
    if (!isIterationMode || !selectedElementIds.length) {
      return;
    }
    scheduleHistoryCommit("Move");
    setElementTransforms((current) => {
      let changed = false;
      const next = { ...current };
      selectedElementIds.forEach((id) => {
        if (isLayerHidden(id) || isLayerLocked(id) || isLayerDeleted(id)) {
          return;
        }
        const base = normalizeTransform(current[id]);
        next[id] = {
          ...base,
          x: base.x + deltaX,
          y: base.y + deltaY,
        };
        changed = true;
      });
      return changed ? next : current;
    });
  };

  const handleDeleteSelection = () => {
    if (!isIterationMode || !selectedElementIds.length) {
      return;
    }
    scheduleHistoryCommit("Delete");
    const toDelete = selectedElementIds.filter((id) => !isLayerDeleted(id));
    if (!toDelete.length) {
      updateSelectedElements([]);
      return;
    }
    setDeletedLayerIds((current) => {
      const next = new Set(current);
      toDelete.forEach((id) => next.add(id));
      return Array.from(next);
    });
    setHighlightedIds((current) =>
      current.filter((id) => !toDelete.includes(id))
    );
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !toDelete.includes(layerId)
        );
        if (filtered.length !== (folder.layerIds ?? []).length) {
          changed = true;
        }
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      return changed ? next : current;
    });
    setLayerState((current) => {
      let changed = false;
      const next = { ...current };
      toDelete.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
    setTextEdits((current) => {
      let changed = false;
      const next = { ...current };
      toDelete.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
    setElementTransforms((current) => {
      let changed = false;
      const next = { ...current };
      toDelete.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
    setTextEditDraft((current) => {
      if (current && toDelete.includes(current.id)) {
        return null;
      }
      return current;
    });
    toDelete.forEach((id) => {
      if (textBaseRef.current[id]) {
        delete textBaseRef.current[id];
      }
    });
    updateSelectedElements([]);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!selectedElementIds.length) {
        return;
      }
      event.preventDefault();
      handleDeleteSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelection, isIterationMode, selectedElementIds]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!selectedElementIds.length) {
        return;
      }
      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
      let deltaX = 0;
      let deltaY = 0;
      switch (event.key) {
        case "ArrowLeft":
          deltaX = -step;
          break;
        case "ArrowRight":
          deltaX = step;
          break;
        case "ArrowUp":
          deltaY = -step;
          break;
        case "ArrowDown":
          deltaY = step;
          break;
        default:
          return;
      }
      event.preventDefault();
      handleNudgeSelection(deltaX, deltaY);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNudgeSelection, isIterationMode, selectedElementIds]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      const point = getPreviewCenter();
      if (!point) {
        return;
      }
      if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
        event.preventDefault();
        applyZoom(point, 1);
        return;
      }
      if (event.key === "-" || event.code === "NumpadSubtract") {
        event.preventDefault();
        applyZoom(point, -1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyZoom, getPreviewCenter, isIterationMode]);

  const handleToggleLayerVisibility = (id) => {
    scheduleHistoryCommit("Layer");
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
    scheduleHistoryCommit("Layer");
    setLayerState((current) => {
      const layer = current[id] ?? { id, name: id, locked: false, hidden: false };
      return { ...current, [id]: { ...layer, locked: !layer.locked } };
    });
  };

  const handleCreateLayerFolder = () => {
    scheduleHistoryCommit("Layer");
    const folderId = `folder-${Date.now()}`;
    const selected = selectedElementIds;
    const selectedSet = new Set(selected);
    setLayerFolders((current) => {
      const folderName = `Folder ${Object.keys(current).length + 1}`;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      next[folderId] = {
        id: folderId,
        name: folderName,
        layerIds: selected,
        collapsed: false,
      };
      return next;
    });
    setLayerFolderOrder((current) => [folderId, ...current]);
  };

  const handleRenameLayerFolder = (folderId, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      const folder = current[folderId];
      if (!folder || folder.name === trimmed) {
        return current;
      }
      return { ...current, [folderId]: { ...folder, name: trimmed } };
    });
  };

  const handleRemoveLayerFolder = (folderId) => {
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      if (!current[folderId]) {
        return current;
      }
      const next = { ...current };
      delete next[folderId];
      return next;
    });
    setLayerFolderOrder((current) =>
      current.filter((entry) => entry !== folderId)
    );
  };

  const handleToggleLayerFolderCollapsed = (folderId) => {
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      const folder = current[folderId];
      if (!folder) {
        return current;
      }
      return {
        ...current,
        [folderId]: { ...folder, collapsed: !folder.collapsed },
      };
    });
  };

  const handleAddSelectionToFolder = (folderId) => {
    if (!selectedElementIds.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const selectedSet = new Set(selectedElementIds);
    setLayerFolders((current) => {
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      const target = next[folderId];
      if (!target) {
        return current;
      }
      const combined = Array.from(
        new Set([...(target.layerIds ?? []), ...selectedElementIds])
      );
      next[folderId] = { ...target, layerIds: combined };
      return next;
    });
  };

  const handleToggleLayerFolderVisibility = (folderId) => {
    const folder = layerFolders[folderId];
    if (!folder?.layerIds?.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const layerIds = folder.layerIds;
    const shouldHide = layerIds.some((id) => !isLayerHidden(id));
    setLayerState((current) => {
      const next = { ...current };
      layerIds.forEach((id) => {
        const layer = current[id] ?? {
          id,
          name: id,
          locked: false,
          hidden: false,
        };
        next[id] = { ...layer, hidden: shouldHide };
      });
      return next;
    });
    if (shouldHide) {
      setSelectedElementIds((current) =>
        current.filter((id) => !layerIds.includes(id))
      );
      setHighlightedIds((current) =>
        current.filter((id) => !layerIds.includes(id))
      );
    }
  };

  const handleToggleLayerFolderLock = (folderId) => {
    const folder = layerFolders[folderId];
    if (!folder?.layerIds?.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const layerIds = folder.layerIds;
    const shouldLock = layerIds.some((id) => !isLayerLocked(id));
    setLayerState((current) => {
      const next = { ...current };
      layerIds.forEach((id) => {
        const layer = current[id] ?? {
          id,
          name: id,
          locked: false,
          hidden: false,
        };
        next[id] = { ...layer, locked: shouldLock };
      });
      return next;
    });
  };

  return {
    state: {
      fileMeta,
      isDragging,
      gallery,
      galleryFiles,
      activeIndex,
      viewMode,
      previewCount,
      selectedPreviewIndex,
      modelQuality,
      creativityValue,
      title,
      name,
      details,
      showComponents,
      isGeneratingStructure,
      generationError,
      isGeneratingPreviews,
      previewError,
      previewItems,
      structureTree,
      structureFlow,
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
      showHistory,
      showTextPanel,
      showGrid,
      snapToGrid,
      showGuides,
      snapToGuides,
      gridSize,
      guides,
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
      zoomLevel: zoomState.zoom,
      panOffset: zoomState.pan,
      isSpacePanning,
      isPanning,
      textEdits,
      textEditDraft,
      layerState,
      layerFolders,
      layerFolderOrder,
      deletedLayerIds,
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
      selectedNodeDescription,
      selectedNodeRequirements,
      qualityLabel,
      qualityIndex,
      overlayMode,
      isOverlayTool,
      isTextTool,
      isZoomTool,
      zoomLevel,
      panOffset,
      isPanMode,
      isPanning,
      canTransform,
      canBoxSelect,
      stageSize,
      notePosition,
      moveTargets,
      layerEntries,
      layerFolderEntries,
      ungroupedLayerEntries,
      iterationPatch,
      verticalGuides,
      horizontalGuides,
      historyEntries,
      activeHistoryId,
      canUndo,
      canRedo,
    },
    refs: {
      iterationRef,
      iterationPreviewRef,
      iterationSiteRef,
    },
    actions: {
      setActiveIndex,
      setPreviewCount,
      setModelQuality,
      setCreativityValue,
      setTitle,
      setName,
      setDetails,
      setShowComponents,
      setViewMode,
      setSelectedPreviewIndex,
      setCodePanelMode,
      setAgentInput,
      setIterationTool,
      setShowTransformControls,
      setShowLayers,
      setShowHistory,
      setShowTextPanel,
      setShowGrid,
      setSnapToGrid,
      setShowGuides,
      setSnapToGuides,
      setGridSize,
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
      handleGeneratePreviews,
      handleGenerateStructure,
      handleNodeClick,
      handleOpenCodeFile,
      handleEditorChange,
      handleToggleFolder,
      handleAgentSend,
      handleZoomPointer,
      handleZoomWheel,
      handlePanPointerDown,
      handlePanPointerMove,
      handlePanPointerEnd,
      handleCreateGuide,
      handleAddGuide,
      handleUpdateGuide,
      handleRemoveGuide,
      handleClearGuides,
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
      handleDeleteSelection,
      handleUndoHistory,
      handleRedoHistory,
      handleClearHistory,
      handleToggleLayerVisibility,
      handleToggleLayerLock,
      handleCreateLayerFolder,
      handleRenameLayerFolder,
      handleRemoveLayerFolder,
      handleToggleLayerFolderCollapsed,
      handleAddSelectionToFolder,
      handleToggleLayerFolderVisibility,
      handleToggleLayerFolderLock,
      getTransformState,
    },
  };
}
