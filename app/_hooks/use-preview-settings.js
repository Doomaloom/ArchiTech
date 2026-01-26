"use client";

import { useState } from "react";

export default function usePreviewSettings({ setViewMode } = {}) {
  const [previewCount, setPreviewCount] = useState(3);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [speedValue, setSpeedValue] = useState(60);

  const qualityValue = 100 - speedValue;

  const handleSelectPreview = (index) => {
    setSelectedPreviewIndex(index);
    if (setViewMode) {
      setViewMode("selected");
    }
  };

  const handleIteratePreview = (index) => {
    setSelectedPreviewIndex(index);
    if (setViewMode) {
      setViewMode("iterate");
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
