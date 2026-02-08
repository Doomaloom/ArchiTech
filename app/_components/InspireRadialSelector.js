"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, MenuItem } from "@spaceymonk/react-radial-menu";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const IconSpark = () => (
  <svg {...iconProps}>
    <path d="M12 2l2.6 5.8L20 9l-5.4 1.7L12 18l-2.6-7.3L4 9l5.4-1.2L12 2z" />
  </svg>
);

const IconOrbit = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M3 12c2.5-4.5 6-6.5 9-6.5s6.5 2 9 6.5c-2.5 4.5-6 6.5-9 6.5s-6.5-2-9-6.5z" />
  </svg>
);

const IconTarget = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
  </svg>
);

const IconShield = () => (
  <svg {...iconProps}>
    <path d="M12 3l7 3v6c0 5-3.4 8.7-7 10.8C8.4 20.7 5 17 5 12V6l7-3z" />
  </svg>
);

const IconBolt = () => (
  <svg {...iconProps}>
    <path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" />
  </svg>
);

const IconCompass = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="8" />
    <path d="M14.5 9.5l-2.8 1.1-1.2 3 2.8-1.1 1.2-3z" />
    <path d="M12 4.5v2.2M12 17.3v2.2" />
  </svg>
);

const DEFAULT_OPTIONS = [
  { id: "clarity", label: "Clarity", icon: <IconTarget /> },
  { id: "momentum", label: "Momentum", icon: <IconBolt /> },
  { id: "trust", label: "Trust", icon: <IconShield /> },
  { id: "delight", label: "Delight", icon: <IconSpark /> },
  { id: "conversion", label: "Conversion", icon: <IconOrbit /> },
  { id: "story", label: "Story", icon: <IconCompass /> },
];

const DEFAULT_QUESTIONS = [
  {
    id: "first-impression",
    prompt: "What should the first impression emphasize?",
    helper: "Pick the primary lens for the opening screen.",
    options: [
      { id: "clarity", label: "Clarity", icon: <IconTarget /> },
      { id: "energy", label: "Energy", icon: <IconBolt /> },
      { id: "trust", label: "Trust", icon: <IconShield /> },
      { id: "delight", label: "Delight", icon: <IconSpark /> },
      { id: "direction", label: "Direction", icon: <IconCompass /> },
    ],
  },
  {
    id: "tone",
    prompt: "Which tone should lead the story?",
    helper: "Set the emotional temperature of the narrative.",
    options: [
      { id: "bold", label: "Bold", icon: <IconBolt /> },
      { id: "calm", label: "Calm", icon: <IconOrbit /> },
      { id: "crafted", label: "Crafted", icon: <IconShield /> },
      { id: "playful", label: "Playful", icon: <IconSpark /> },
      { id: "precise", label: "Precise", icon: <IconTarget /> },
    ],
  },
  {
    id: "hero-focus",
    prompt: "What should the hero section spotlight?",
    helper: "Choose the core story block to anchor the layout.",
    options: [
      { id: "product", label: "Product", icon: <IconOrbit /> },
      { id: "mission", label: "Mission", icon: <IconCompass /> },
      { id: "outcome", label: "Outcome", icon: <IconTarget /> },
      { id: "community", label: "Community", icon: <IconSpark /> },
      { id: "offer", label: "Offer", icon: <IconBolt /> },
    ],
  },
  {
    id: "cta-feel",
    prompt: "How should CTAs feel?",
    helper: "Define the ask that anchors conversions.",
    options: [
      { id: "direct", label: "Direct", icon: <IconTarget /> },
      { id: "inviting", label: "Inviting", icon: <IconSpark /> },
      { id: "exclusive", label: "Exclusive", icon: <IconShield /> },
      { id: "guided", label: "Guided", icon: <IconCompass /> },
    ],
  },
  {
    id: "layout-energy",
    prompt: "What layout energy fits best?",
    helper: "Set the structural rhythm of the page.",
    options: [
      { id: "grid", label: "Grid", icon: <IconTarget /> },
      { id: "flow", label: "Flow", icon: <IconOrbit /> },
      { id: "minimal", label: "Minimal", icon: <IconShield /> },
      { id: "editorial", label: "Editorial", icon: <IconCompass /> },
      { id: "experimental", label: "Experimental", icon: <IconBolt /> },
    ],
  },
];

const buildSelectionItems = (questions, selections) => {
  return questions.slice(0, 5).map((question, index) => {
    const selectedId = selections[question.id];
    const selectedOption = question.options?.find(
      (option) => option.id === selectedId
    );
    return {
      id: question.id,
      step: index + 1,
      label: selectedOption?.label || "Pending",
      isSelected: Boolean(selectedOption),
    };
  });
};

const SelectionCard = ({ item }) => {
  return (
    <div
      className={`inspire-selection-card${
        item.isSelected ? " is-selected" : " is-pending"
      }`}
      style={{ "--reveal-index": item.step }}
      data-step={item.step}
    >
      <span className="inspire-selection-step">0{item.step}</span>
      <span className="inspire-selection-label">{item.label}</span>
    </div>
  );
};

const SelectionTree = ({ items }) => {
  if (!items.length) {
    return null;
  }
  if (items.length === 1) {
    return <SelectionCard item={items[0]} />;
  }
  const [first, second, ...rest] = items;
  return (
    <div className="inspire-selection-split is-horizontal">
      <div className="inspire-selection-slot">
        <SelectionCard item={first} />
      </div>
      <div className="inspire-selection-split is-vertical">
        <div className="inspire-selection-slot">
          <SelectionCard item={second} />
        </div>
        <div className="inspire-selection-slot">
          {rest.length ? <SelectionTree items={rest} /> : null}
        </div>
      </div>
    </div>
  );
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildMenuMetrics = (rect) => {
  if (!rect) {
    return null;
  }
  const minSide = Math.min(rect.width, rect.height);
  if (!minSide) {
    return null;
  }
  const outerPadding = clamp(Math.floor(minSide * 0.02), 4, 12);
  const outerRadius = Math.max(50, Math.floor(minSide / 2 - outerPadding));
  const ringThickness = clamp(Math.floor(minSide * 0.13), 64, 84);
  const innerRadius = Math.max(36, outerRadius - ringThickness);
  if (innerRadius >= outerRadius) {
    return null;
  }
  return {
    centerX: rect.width / 2,
    centerY: rect.height / 2,
    innerRadius,
    outerRadius,
  };
};

export default function InspireRadialSelector({
  question,
  options = DEFAULT_OPTIONS,
  questions,
  onSelect,
  onConfirm,
}) {
  const surfaceRef = useRef(null);
  const [menuMetrics, setMenuMetrics] = useState(null);
  const resolvedQuestions = useMemo(() => {
    if (questions?.length) {
      return questions;
    }
    if (question) {
      return [
        {
          id: "prompt",
          prompt: question,
          helper: "Choose the focus that feels right.",
          options: options?.length >= 2 ? options : DEFAULT_OPTIONS,
        },
      ];
    }
    return DEFAULT_QUESTIONS;
  }, [question, options, questions]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const currentQuestion = resolvedQuestions[questionIndex] || resolvedQuestions[0];
  const currentOptions = useMemo(() => {
    if (currentQuestion?.options?.length >= 2) {
      return currentQuestion.options;
    }
    return options?.length >= 2 ? options : DEFAULT_OPTIONS;
  }, [currentQuestion, options]);
  const [selectedByQuestion, setSelectedByQuestion] = useState({});
  const selectionItems = useMemo(() => {
    if (!resolvedQuestions.length) {
      return [];
    }
    return buildSelectionItems(resolvedQuestions, selectedByQuestion);
  }, [resolvedQuestions, selectedByQuestion]);
  const visibleSelectionItems = useMemo(() => {
    return selectionItems.filter((item) => item.isSelected);
  }, [selectionItems]);
  const [activeId, setActiveId] = useState(() => currentOptions[0]?.id ?? null);
  const activeOption = useMemo(() => {
    return (
      currentOptions.find((option) => option.id === activeId) ||
      currentOptions[0] ||
      null
    );
  }, [activeId, currentOptions]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }
    const storedSelection = selectedByQuestion[currentQuestion.id];
    const nextId =
      currentOptions.find((option) => option.id === storedSelection)?.id ||
      currentOptions[0]?.id ||
      null;
    setActiveId(nextId);
  }, [currentQuestion, currentOptions, selectedByQuestion]);

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      const rect = element.getBoundingClientRect();
      const metrics = buildMenuMetrics(rect);
      if (metrics) {
        setMenuMetrics(metrics);
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const centerStyle = useMemo(() => {
    if (!menuMetrics) {
      return undefined;
    }
    const diameter = menuMetrics.innerRadius * 2;
    const maxWidth = clamp(Math.floor(diameter * 0.7), 160, 360);
    return { maxWidth };
  }, [menuMetrics]);

  const handleSelect = (option, index) => {
    setActiveId(option.id);
    onSelect?.(option, index, currentQuestion);
  };

  const handleConfirm = () => {
    if (!activeOption || !currentQuestion) {
      return;
    }
    setSelectedByQuestion((current) => ({
      ...current,
      [currentQuestion.id]: activeOption.id,
    }));
    onConfirm?.(activeOption, currentQuestion);
    setQuestionIndex((current) => {
      if (resolvedQuestions.length <= 1) {
        return current;
      }
      return (current + 1) % resolvedQuestions.length;
    });
  };

  return (
    <div className="inspire-radial-stage">
      <div className="inspire-radial-left">
        <div className="inspire-radial-question">
          <span className="inspire-radial-kicker">Inspire prompt</span>
          <h2>{currentQuestion?.prompt || question}</h2>
          <p>
            {currentQuestion?.helper ||
              "Select one focus area to steer the next iteration."}
          </p>
        </div>
        {visibleSelectionItems.length ? (
          <div className="inspire-selection-panel">
            <span className="inspire-selection-kicker">Selections</span>
            <div className="inspire-selection-tree">
              <SelectionTree items={visibleSelectionItems} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="inspire-radial-surface" ref={surfaceRef}>
        <div className="inspire-radial-center">
          <span className="inspire-radial-center-kicker">Selected focus</span>
          <div className="inspire-radial-center-row">
            <div className="inspire-radial-center-pill" style={centerStyle}>
              <strong>{activeOption?.label || "Select"}</strong>
            </div>
            <button
              className="inspire-radial-confirm"
              type="button"
              onClick={handleConfirm}
              aria-label="Confirm selection"
              disabled={!activeOption}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4.5 10.5l3.2 3.2 7.8-7.8" />
              </svg>
            </button>
          </div>
        </div>
        {menuMetrics ? (
          <Menu
            key={currentQuestion?.id || "radial"}
            centerX={menuMetrics.centerX}
            centerY={menuMetrics.centerY}
            innerRadius={menuMetrics.innerRadius}
            outerRadius={menuMetrics.outerRadius}
            show={true}
            drawBackground
            animation={["fade", "scale"]}
            animationTimeout={180}
            className="inspire-radial-menu"
          >
            {currentOptions.map((option, index) => (
              <MenuItem
                key={option.id}
                onItemClick={() => handleSelect(option, index)}
                data={option.id}
              >
                <div
                  className="inspire-radial-item"
                  data-active={activeId === option.id}
                >
                  <span className="inspire-radial-label">{option.label}</span>
                  <span className="inspire-radial-icon">{option.icon}</span>
                </div>
              </MenuItem>
            ))}
          </Menu>
        ) : null}
      </div>
    </div>
  );
}
