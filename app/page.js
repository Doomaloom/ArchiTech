"use client";

import {
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import Link from "next/link";
import { ArcherContainer, ArcherElement } from "react-archer";

const useAutoSizeTransition = (nodeRef, deps, onStart, onEnd) => {
  const prevSizeRef = useRef(null);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }

    const next = node.getBoundingClientRect();
    const prev = prevSizeRef.current;
    prevSizeRef.current = next;

    if (!prev) {
      return;
    }

    const widthDiff = Math.abs(prev.width - next.width);
    const heightDiff = Math.abs(prev.height - next.height);
    if (widthDiff < 0.5 && heightDiff < 0.5) {
      return;
    }

    onStart?.();

    node.style.width = `${prev.width}px`;
    node.style.height = `${prev.height}px`;
    node.getBoundingClientRect();
    node.style.width = `${next.width}px`;
    node.style.height = `${next.height}px`;

    let finished = false;
    const handleEnd = (event) => {
      if (finished) {
        return;
      }
      if (event.propertyName !== "width" && event.propertyName !== "height") {
        return;
      }
      finished = true;
      node.style.width = "";
      node.style.height = "";
      node.removeEventListener("transitionend", handleEnd);
      node.removeEventListener("transitioncancel", handleEnd);
      onEnd?.();
    };

    node.addEventListener("transitionend", handleEnd);
    node.addEventListener("transitioncancel", handleEnd);
  }, [...deps, onStart, onEnd]);
};

const NodeBox = forwardRef(function NodeBox(
  { className, onAnimationStart, onAnimationEnd, nodeRef, children },
  ref
) {
  const setRefs = useCallback(
    (node) => {
      if (nodeRef) {
        nodeRef.current = node;
      }
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref, nodeRef]
  );

  return (
    <div
      ref={setRefs}
      className={className}
      onAnimationStart={onAnimationStart}
      onAnimationEnd={onAnimationEnd}
    >
      {children}
    </div>
  );
});

const LanguageInput = ({
  inputRef,
  value,
  suggestion,
  placeholder,
  ariaLabel,
  onChange,
  onKeyDown,
}) => {
  const typedMeasureRef = useRef(null);
  const suggestionMeasureRef = useRef(null);
  const [ghostOffset, setGhostOffset] = useState(0);

  const showGhost =
    suggestion &&
    value.trim() === value &&
    suggestion.toLowerCase().startsWith(value.toLowerCase()) &&
    value.length < suggestion.length;

  useLayoutEffect(() => {
    if (!showGhost) {
      setGhostOffset(0);
      return;
    }

    const typedWidth =
      typedMeasureRef.current?.getBoundingClientRect().width ?? 0;
    const suggestionWidth =
      suggestionMeasureRef.current?.getBoundingClientRect().width ?? 0;
    setGhostOffset(Math.max(0, (suggestionWidth - typedWidth) / 2));
  }, [showGhost, value, suggestion]);

  return (
    <div className="language-input-wrap">
      {showGhost ? (
        <span
          className="language-ghost"
          aria-hidden="true"
          style={{ "--ghost-offset": `${ghostOffset}px` }}
        >
          <span className="ghost-typed">{value}</span>
          <span className="ghost-rest">{suggestion.slice(value.length)}</span>
        </span>
      ) : null}
      <span className="language-measure" ref={typedMeasureRef}>
        {value}
      </span>
      <span className="language-measure" ref={suggestionMeasureRef}>
        {suggestion ?? ""}
      </span>
      <input
        ref={inputRef}
        className="language-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default function Home() {
  const [projectName, setProjectName] = useState("");
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState("backend");
  const [backendInput, setBackendInput] = useState("");
  const [backendLanguages, setBackendLanguages] = useState([]);
  const [frontendInput, setFrontendInput] = useState("");
  const [frontendLanguages, setFrontendLanguages] = useState([]);
  const [cloudInput, setCloudInput] = useState("");
  const [cloudServices, setCloudServices] = useState([]);
  const [architectureInput, setArchitectureInput] = useState("");
  const [architectureStyles, setArchitectureStyles] = useState([]);
  const [editingNode, setEditingNode] = useState(null);
  const [returnPhase, setReturnPhase] = useState(null);
  const [nodeLocks, setNodeLocks] = useState({
    project: false,
    backend: false,
    frontend: false,
    cloud: false,
    architecture: false,
  });
  const inputRef = useRef(null);
  const backendRef = useRef(null);
  const frontendRef = useRef(null);
  const cloudRef = useRef(null);
  const architectureRef = useRef(null);
  const backendNodeRef = useRef(null);
  const frontendNodeRef = useRef(null);
  const cloudNodeRef = useRef(null);
  const architectureNodeRef = useRef(null);
  const archerRef = useRef(null);
  const animatingCount = useRef(0);
  const rafRef = useRef(null);

  const backendOptions = useMemo(
    () => [
      "Node.js",
      "Python",
      "Go",
      "Java",
      "C#",
      "PHP",
      "Ruby",
      "Rust",
      "Elixir",
      "Kotlin",
    ],
    []
  );
  const frontendOptions = useMemo(
    () => [
      "React",
      "Next.js",
      "Vue",
      "Nuxt",
      "Angular",
      "Svelte",
      "Solid",
      "Astro",
      "Qwik",
      "Lit",
    ],
    []
  );
  const cloudOptions = useMemo(
    () => [
      "Cloud Run",
      "App Engine",
      "Cloud Functions",
      "Cloud Pub/Sub",
      "Cloud Storage",
      "Cloud SQL",
      "Firestore",
      "Spanner",
      "Bigtable",
      "BigQuery",
      "GKE",
      "Cloud CDN",
      "Cloud Load Balancing",
      "Cloud Armor",
      "Cloud Tasks",
      "Cloud Scheduler",
      "Cloud Build",
      "Artifact Registry",
    ],
    []
  );
  const architectureOptions = useMemo(
    () => [
      "SOLID",
      "Hexagonal",
      "Clean Architecture",
      "Onion",
      "Layered",
      "Microservices",
      "Modular Monolith",
      "Event-Driven",
      "CQRS",
      "Serverless",
      "DDD",
    ],
    []
  );

  const projectSize = Math.max(
    6,
    (projectName || "Name your project").length
  );
  const activePhase = editingNode ?? phase;

  useEffect(() => {
    if (!locked || activePhase === "project") {
      inputRef.current?.focus();
    } else if (activePhase === "backend") {
      backendRef.current?.focus();
    } else if (activePhase === "frontend") {
      frontendRef.current?.focus();
    } else if (activePhase === "cloud") {
      cloudRef.current?.focus();
    } else {
      architectureRef.current?.focus();
    }
  }, [locked, activePhase]);

  useEffect(() => {
    if (!locked) {
      animatingCount.current = 0;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [locked]);

  useLayoutEffect(() => {
    archerRef.current?.refreshScreen();
  }, [
    locked,
    backendLanguages,
    frontendLanguages,
    cloudServices,
    architectureStyles,
    editingNode,
    phase,
    projectName,
  ]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleNodeAnimationStart = useCallback(() => {
    animatingCount.current += 1;
    if (rafRef.current === null) {
      const tick = () => {
        archerRef.current?.refreshScreen();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const handleNodeAnimationEnd = useCallback(() => {
    animatingCount.current = Math.max(0, animatingCount.current - 1);
    if (animatingCount.current === 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      archerRef.current?.refreshScreen();
    }
  }, []);

  useAutoSizeTransition(
    backendNodeRef,
    [backendLanguages],
    handleNodeAnimationStart,
    handleNodeAnimationEnd
  );
  useAutoSizeTransition(
    frontendNodeRef,
    [frontendLanguages],
    handleNodeAnimationStart,
    handleNodeAnimationEnd
  );
  useAutoSizeTransition(
    cloudNodeRef,
    [cloudServices],
    handleNodeAnimationStart,
    handleNodeAnimationEnd
  );
  useAutoSizeTransition(
    architectureNodeRef,
    [architectureStyles],
    handleNodeAnimationStart,
    handleNodeAnimationEnd
  );

  const getSuggestion = (options, value, selected) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const lowered = trimmed.toLowerCase();
    const selectedSet = new Set(
      selected.map((entry) => entry.toLowerCase())
    );
    const exact = options.find(
      (option) =>
        option.toLowerCase() === lowered &&
        !selectedSet.has(option.toLowerCase())
    );
    if (exact) {
      return exact;
    }
    return (
      options.find(
        (option) =>
          option.toLowerCase().startsWith(lowered) &&
          !selectedSet.has(option.toLowerCase())
      ) || null
    );
  };

  const handleProjectKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (projectName.trim().length > 0) {
        setLocked(true);
      }
    }
  };

  const handleBackendKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = getSuggestion(
        backendOptions,
        backendInput,
        backendLanguages
      );
      if (suggestion) {
        setBackendLanguages((prev) => [...prev, suggestion]);
        setBackendInput("");
      }
    }
  };

  const handleFrontendKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = getSuggestion(
        frontendOptions,
        frontendInput,
        frontendLanguages
      );
      if (suggestion) {
        setFrontendLanguages((prev) => [...prev, suggestion]);
        setFrontendInput("");
      }
    }
  };

  const handleCloudKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = getSuggestion(cloudOptions, cloudInput, cloudServices);
      if (suggestion) {
        setCloudServices((prev) => [...prev, suggestion]);
        setCloudInput("");
      }
    }
  };

  const handleArchitectureKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = getSuggestion(
        architectureOptions,
        architectureInput,
        architectureStyles
      );
      if (suggestion) {
        setArchitectureStyles((prev) => [...prev, suggestion]);
        setArchitectureInput("");
      }
    }
  };

  const beginEdit = useCallback(
    (node) => {
      setEditingNode((current) => {
        if (!current) {
          setReturnPhase(phase);
        }
        return node;
      });
    },
    [phase]
  );

  const endEdit = useCallback(() => {
    setEditingNode(null);
    if (returnPhase) {
      setPhase(returnPhase);
    }
  }, [returnPhase]);

  const toggleLock = useCallback((node) => {
    setNodeLocks((prev) => ({ ...prev, [node]: !prev[node] }));
  }, []);
  const handleNodeActionPointerUp = useCallback((event) => {
    event.currentTarget.blur();
  }, []);

  const projectRelations = [];
  if (backendLanguages.length > 0) {
    projectRelations.push({
      targetId: "backend-node",
      targetAnchor: "top",
      sourceAnchor: "bottom",
    });
  }
  if (frontendLanguages.length > 0) {
    projectRelations.push({
      targetId: "frontend-node",
      targetAnchor: "top",
      sourceAnchor: "bottom",
    });
  }
  if (cloudServices.length > 0) {
    projectRelations.push({
      targetId: "cloud-node",
      targetAnchor: "top",
      sourceAnchor: "bottom",
    });
  }
  if (architectureStyles.length > 0) {
    projectRelations.push({
      targetId: "architecture-node",
      targetAnchor: "top",
      sourceAnchor: "bottom",
    });
  }

  const backendSuggestion = getSuggestion(
    backendOptions,
    backendInput,
    backendLanguages
  );
  const frontendSuggestion = getSuggestion(
    frontendOptions,
    frontendInput,
    frontendLanguages
  );
  const cloudSuggestion = getSuggestion(
    cloudOptions,
    cloudInput,
    cloudServices
  );
  const architectureSuggestion = getSuggestion(
    architectureOptions,
    architectureInput,
    architectureStyles
  );
  const activeNodesCount =
    (backendLanguages.length > 0 ? 1 : 0) +
    (frontendLanguages.length > 0 ? 1 : 0) +
    (cloudServices.length > 0 ? 1 : 0) +
    (architectureStyles.length > 0 ? 1 : 0);

  const phaseAction =
    activePhase === "project"
      ? null
      : editingNode
      ? (
        <button
          className="phase-action"
          type="button"
          onClick={endEdit}
          aria-label="Done editing"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 12.5l4 4 8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
      : phase === "backend"
      ? (
        <button
          className="phase-action"
          type="button"
          onClick={() => setPhase("frontend")}
          disabled={backendLanguages.length === 0}
          aria-label="Next: Front end"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12h11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
      : phase === "frontend"
      ? (
        <button
          className="phase-action"
          type="button"
          onClick={() => setPhase("cloud")}
          disabled={frontendLanguages.length === 0}
          aria-label="Next: Cloud"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12h11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
      : phase === "cloud"
      ? (
        <button
          className="phase-action"
          type="button"
          onClick={() => setPhase("architecture")}
          disabled={cloudServices.length === 0}
          aria-label="Next: Architecture"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12h11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
      : phase === "architecture"
      ? (
        <Link
          className={`phase-action ${
            architectureStyles.length > 0 ? "" : "is-disabled"
          }`}
          href={architectureStyles.length > 0 ? "/page2" : "#"}
          aria-label="Done"
          aria-disabled={architectureStyles.length === 0}
          tabIndex={architectureStyles.length > 0 ? 0 : -1}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 12.5l4 4 8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )
      : null;

  return (
    <div className={`project-entry ${locked ? "is-locked" : ""}`}>
      <div className="project-stage">
        {locked ? (
          <>
            <ArcherContainer
              ref={archerRef}
              strokeColor="rgba(15, 23, 42, 0.35)"
              strokeWidth={1.2}
              offset={8}
            >
              <div className="tree-graph">
                <ArcherElement id="project-node" relations={projectRelations}>
                  <div
                    className={`project-box ${
                      nodeLocks.project ? "is-locked" : ""
                    } ${locked ? "is-collapsed" : ""}`}
                    onAnimationStart={handleNodeAnimationStart}
                    onAnimationEnd={handleNodeAnimationEnd}
                  >
                    <div className="node-actions">
                      <button
                        className="node-action"
                        type="button"
                        onPointerUp={handleNodeActionPointerUp}
                        onClick={() => beginEdit("project")}
                        aria-label="Edit project name"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M4 16.8V20h3.2l9.2-9.2-3.2-3.2L4 16.8z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14.8 6.8l2.4-2.4 3.2 3.2-2.4 2.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        className="node-action"
                        type="button"
                        onPointerUp={handleNodeActionPointerUp}
                        onClick={() => toggleLock("project")}
                        aria-label={nodeLocks.project ? "Unlock project" : "Lock project"}
                      >
                        {nodeLocks.project ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M7 10V8a5 5 0 0110 0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                            <rect
                              x="6"
                              y="10"
                              width="12"
                              height="10"
                              rx="2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M8.5 10V8a3.5 3.5 0 016.8-1.1"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                            <rect
                              x="6"
                              y="10"
                              width="12"
                              height="10"
                              rx="2.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <input
                      ref={inputRef}
                      className="project-input"
                      type="text"
                      placeholder="Name your project"
                      style={{ "--input-ch": `${projectSize}ch` }}
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      onKeyDown={handleProjectKeyDown}
                      readOnly={locked && editingNode !== "project"}
                      aria-label="Project name"
                    />
                  </div>
                </ArcherElement>
                <div
                  className={`tree-branches ${
                    activeNodesCount > 1 ? "is-split" : "is-single"
                  }`}
                >
                  {backendLanguages.length > 0 ? (
                    <ArcherElement id="backend-node">
                      <NodeBox
                        className={`tree-node ${
                          nodeLocks.backend ? "is-locked" : ""
                        }`}
                        nodeRef={backendNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
                        <div className="node-actions">
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => beginEdit("backend")}
                            aria-label="Edit backend"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 16.8V20h3.2l9.2-9.2-3.2-3.2L4 16.8z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14.8 6.8l2.4-2.4 3.2 3.2-2.4 2.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => toggleLock("backend")}
                            aria-label={
                              nodeLocks.backend ? "Unlock backend" : "Lock backend"
                            }
                          >
                            {nodeLocks.backend ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M7 10V8a5 5 0 0110 0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M8.5 10V8a3.5 3.5 0 016.8-1.1"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <span className="tree-label">Back end</span>
                        <div className="tree-tags">
                          {backendLanguages.map((language) => (
                            <span className="tree-tag" key={language}>
                              {language}
                            </span>
                          ))}
                        </div>
                      </NodeBox>
                    </ArcherElement>
                  ) : null}
                  {frontendLanguages.length > 0 ? (
                    <ArcherElement id="frontend-node">
                      <NodeBox
                        className={`tree-node ${
                          nodeLocks.frontend ? "is-locked" : ""
                        }`}
                        nodeRef={frontendNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
                        <div className="node-actions">
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => beginEdit("frontend")}
                            aria-label="Edit frontend"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 16.8V20h3.2l9.2-9.2-3.2-3.2L4 16.8z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14.8 6.8l2.4-2.4 3.2 3.2-2.4 2.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => toggleLock("frontend")}
                            aria-label={
                              nodeLocks.frontend ? "Unlock frontend" : "Lock frontend"
                            }
                          >
                            {nodeLocks.frontend ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M7 10V8a5 5 0 0110 0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M8.5 10V8a3.5 3.5 0 016.8-1.1"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <span className="tree-label">Front end</span>
                        <div className="tree-tags">
                          {frontendLanguages.map((language) => (
                            <span className="tree-tag" key={language}>
                              {language}
                            </span>
                          ))}
                        </div>
                      </NodeBox>
                    </ArcherElement>
                  ) : null}
                  {cloudServices.length > 0 ? (
                    <ArcherElement id="cloud-node">
                      <NodeBox
                        className={`tree-node ${
                          nodeLocks.cloud ? "is-locked" : ""
                        }`}
                        nodeRef={cloudNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
                        <div className="node-actions">
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => beginEdit("cloud")}
                            aria-label="Edit cloud"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 16.8V20h3.2l9.2-9.2-3.2-3.2L4 16.8z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14.8 6.8l2.4-2.4 3.2 3.2-2.4 2.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => toggleLock("cloud")}
                            aria-label={
                              nodeLocks.cloud ? "Unlock cloud" : "Lock cloud"
                            }
                          >
                            {nodeLocks.cloud ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M7 10V8a5 5 0 0110 0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M8.5 10V8a3.5 3.5 0 016.8-1.1"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <span className="tree-label">Cloud</span>
                        <div className="tree-tags">
                          {cloudServices.map((service) => (
                            <span className="tree-tag" key={service}>
                              {service}
                            </span>
                          ))}
                        </div>
                      </NodeBox>
                    </ArcherElement>
                  ) : null}
                  {architectureStyles.length > 0 ? (
                    <ArcherElement id="architecture-node">
                      <NodeBox
                        className={`tree-node ${
                          nodeLocks.architecture ? "is-locked" : ""
                        }`}
                        nodeRef={architectureNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
                        <div className="node-actions">
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => beginEdit("architecture")}
                            aria-label="Edit architecture"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 16.8V20h3.2l9.2-9.2-3.2-3.2L4 16.8z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14.8 6.8l2.4-2.4 3.2 3.2-2.4 2.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className="node-action"
                            type="button"
                            onPointerUp={handleNodeActionPointerUp}
                            onClick={() => toggleLock("architecture")}
                            aria-label={
                              nodeLocks.architecture
                                ? "Unlock architecture"
                                : "Lock architecture"
                            }
                          >
                            {nodeLocks.architecture ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M7 10V8a5 5 0 0110 0"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M8.5 10V8a3.5 3.5 0 016.8-1.1"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                                <rect
                                  x="6"
                                  y="10"
                                  width="12"
                                  height="10"
                                  rx="2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        <span className="tree-label">Architecture</span>
                        <div className="tree-tags">
                          {architectureStyles.map((style) => (
                            <span className="tree-tag" key={style}>
                              {style}
                            </span>
                          ))}
                        </div>
                      </NodeBox>
                    </ArcherElement>
                  ) : null}
                </div>
              </div>
            </ArcherContainer>
            {activePhase !== "project" ? (
              <div className="language-entry">
                <div className="language-entry-row">
                  {activePhase === "backend" ? (
                    <LanguageInput
                      inputRef={backendRef}
                      value={backendInput}
                      suggestion={backendSuggestion}
                      placeholder="Enter backend languages"
                      ariaLabel="Backend languages"
                      onChange={(event) => setBackendInput(event.target.value)}
                      onKeyDown={handleBackendKeyDown}
                    />
                  ) : activePhase === "frontend" ? (
                    <LanguageInput
                      inputRef={frontendRef}
                      value={frontendInput}
                      suggestion={frontendSuggestion}
                      placeholder="Enter frontend languages"
                      ariaLabel="Frontend languages"
                      onChange={(event) => setFrontendInput(event.target.value)}
                      onKeyDown={handleFrontendKeyDown}
                    />
                  ) : activePhase === "cloud" ? (
                    <LanguageInput
                      inputRef={cloudRef}
                      value={cloudInput}
                      suggestion={cloudSuggestion}
                      placeholder="Enter your cloud stack"
                      ariaLabel="Cloud stack"
                      onChange={(event) => setCloudInput(event.target.value)}
                      onKeyDown={handleCloudKeyDown}
                    />
                  ) : (
                    <LanguageInput
                      inputRef={architectureRef}
                      value={architectureInput}
                      suggestion={architectureSuggestion}
                      placeholder="Enter architecture styles"
                      ariaLabel="Architecture styles"
                      onChange={(event) => setArchitectureInput(event.target.value)}
                      onKeyDown={handleArchitectureKeyDown}
                    />
                  )}
                  {phaseAction}
                </div>
              </div>
            ) : null}
            {activePhase === "project" && editingNode ? (
              <button className="phase-action" type="button" onClick={endEdit} aria-label="Done editing">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 12.5l4 4 8-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
          </>
        ) : (
          <div className="project-box">
            <input
              ref={inputRef}
              className="project-input"
              type="text"
              placeholder="Name your project"
              style={{ "--input-ch": `${projectSize}ch` }}
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              onKeyDown={handleProjectKeyDown}
              readOnly={locked}
              aria-label="Project name"
            />
          </div>
        )}
      </div>
    </div>
  );
}
