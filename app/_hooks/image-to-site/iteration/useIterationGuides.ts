import { useMemo, useRef, useState } from "react";

import { roundValue } from "../../../_lib/geometry";
import { GUIDE_COLORS } from "./constants";
import { clampValue } from "./geometry";

export default function useIterationGuides({ stageSize, setShowGuides }) {
  const [guides, setGuides] = useState(() => []);
  const guideColorIndexRef = useRef(0);

  const getNextGuideColor = () => {
    const index = guideColorIndexRef.current;
    guideColorIndexRef.current = (index + 1) % GUIDE_COLORS.length;
    return GUIDE_COLORS[index] ?? GUIDE_COLORS[0];
  };

  const handleCreateGuide = (axis, position?: number) => {
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
    if (setShowGuides) {
      setShowGuides(true);
    }
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

  return {
    state: { guides },
    derived: { verticalGuides, horizontalGuides },
    actions: {
      handleCreateGuide,
      handleAddGuide,
      handleUpdateGuide,
      handleRemoveGuide,
      handleClearGuides,
    },
  };
}
