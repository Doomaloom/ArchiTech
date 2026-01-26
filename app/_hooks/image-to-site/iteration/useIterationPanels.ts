import { useEffect, useState } from "react";

export default function useIterationPanels({ isIterationMode }) {
  const [showTransformControls, setShowTransformControls] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [gridSize, setGridSize] = useState(24);
  const [showPatch, setShowPatch] = useState(false);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setShowTextPanel(true);
  }, [isIterationMode]);

  return {
    state: {
      showTransformControls,
      showLayers,
      showHistory,
      showTextPanel,
      showGrid,
      snapToGrid,
      showGuides,
      snapToGuides,
      gridSize,
      showPatch,
    },
    actions: {
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
    },
  };
}
