"use client";

import { useState } from "react";

export default function usePreviewSettings({
  setViewMode,
  currentViewMode,
} = {}) {
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState(60);

  const qualityValue = 100 - speedValue;

  const handleSelectPreview = (index) => {
    const isSameSelection = index === selectedPreviewIndex;
    setSelectedPreviewIndex(index);
    if (!setViewMode) {
      return;
    }
    // First click: go to expanded selected view. Second click on same card: open builder.
    if (!isSameSelection || currentViewMode !== "selected") {
      setViewMode("selected");
      return;
    }
    setViewMode("builder");
  };

  const handleIteratePreview = (index) => {
    setSelectedPreviewIndex(index);
    if (setViewMode) {
      setViewMode("builder");
    }
  };

  return {
    state: {
      previewCount,
      selectedPreviewIndex,
      speedValue,
    },
    derived: { qualityValue },
    actions: {
      setPreviewCount,
      setSelectedPreviewIndex,
      setSpeedValue,
      handleSelectPreview,
      handleIteratePreview,
    },
  };
}
