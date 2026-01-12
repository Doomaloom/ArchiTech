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
  const inputRef = useRef(null);
  const backendRef = useRef(null);
  const frontendRef = useRef(null);
  const backendNodeRef = useRef(null);
  const frontendNodeRef = useRef(null);
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

  const projectSize = Math.max(
    6,
    (projectName || "Name your project").length
  );

  useEffect(() => {
    if (!locked) {
      inputRef.current?.focus();
    } else if (phase === "backend") {
      backendRef.current?.focus();
    } else {
      frontendRef.current?.focus();
    }
  }, [locked, phase]);

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
  }, [locked, backendLanguages, frontendLanguages, phase, projectName]);

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
                    className="project-box"
                    onAnimationStart={handleNodeAnimationStart}
                    onAnimationEnd={handleNodeAnimationEnd}
                  >
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
                </ArcherElement>
                <div
                  className={`tree-branches ${
                    backendLanguages.length > 0 && frontendLanguages.length > 0
                      ? "is-split"
                      : "is-single"
                  }`}
                >
                  {backendLanguages.length > 0 ? (
                    <ArcherElement id="backend-node">
                      <NodeBox
                        className="tree-node"
                        nodeRef={backendNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
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
                        className="tree-node"
                        nodeRef={frontendNodeRef}
                        onAnimationStart={handleNodeAnimationStart}
                        onAnimationEnd={handleNodeAnimationEnd}
                      >
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
                </div>
              </div>
            </ArcherContainer>
            <div className="language-entry">
              {phase === "backend" ? (
                <LanguageInput
                  inputRef={backendRef}
                  value={backendInput}
                  suggestion={backendSuggestion}
                  placeholder="Enter backend languages"
                  ariaLabel="Backend languages"
                  onChange={(event) => setBackendInput(event.target.value)}
                  onKeyDown={handleBackendKeyDown}
                />
              ) : (
                <LanguageInput
                  inputRef={frontendRef}
                  value={frontendInput}
                  suggestion={frontendSuggestion}
                  placeholder="Enter frontend languages"
                  ariaLabel="Frontend languages"
                  onChange={(event) => setFrontendInput(event.target.value)}
                  onKeyDown={handleFrontendKeyDown}
                />
              )}
            </div>
            {phase === "backend" ? (
              <button
                className="next-button"
                type="button"
                onClick={() => setPhase("frontend")}
                disabled={backendLanguages.length === 0}
              >
                Next: Front end
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
