import { buildTransformString, roundValue } from "../../../_lib/geometry";
import type { ElementTransform } from "../../../_lib/iteration-types";

import { normalizeTransform } from "./constants";
import type { AlignmentDelta } from "./alignment-engine";
import { AlignmentScaleResolver } from "./alignment-resolvers";

export interface AlignmentUpdate {
  id: string;
  x: number;
  y: number;
  element?: HTMLElement | null;
}

abstract class AlignmentTransformWriter {
  abstract apply(updates: AlignmentUpdate[]): void;
}

export class StateAlignmentWriter extends AlignmentTransformWriter {
  private setElementTransforms: (
    updater: (
      current: Record<string, ElementTransform>
    ) => Record<string, ElementTransform>
  ) => void;

  constructor(
    setElementTransforms: (
      updater: (
        current: Record<string, ElementTransform>
      ) => Record<string, ElementTransform>
    ) => void
  ) {
    super();
    this.setElementTransforms = setElementTransforms;
  }

  apply(updates: AlignmentUpdate[]) {
    if (!updates.length) {
      return;
    }
    this.setElementTransforms((current) => {
      let changed = false;
      const next = { ...current };
      updates.forEach(({ id, x, y, element }) => {
        const base = normalizeTransform(current[id]);
        const nextTransform = { ...base, x, y };
        if (
          Math.abs(nextTransform.x - base.x) < 0.01 &&
          Math.abs(nextTransform.y - base.y) < 0.01
        ) {
          return;
        }
        next[id] = nextTransform;
        if (element) {
          element.style.transform = buildTransformString(nextTransform);
        }
        changed = true;
      });
      return changed ? next : current;
    });
  }
}

export class EngineAlignmentWriter extends AlignmentTransformWriter {
  private updateElementTransform: (
    id: string,
    nextTransform: Partial<ElementTransform>,
    target?: HTMLElement | null
  ) => void;

  constructor(
    updateElementTransform: (
      id: string,
      nextTransform: Partial<ElementTransform>,
      target?: HTMLElement | null
    ) => void
  ) {
    super();
    this.updateElementTransform = updateElementTransform;
  }

  apply(updates: AlignmentUpdate[]) {
    updates.forEach(({ id, x, y, element }) => {
      this.updateElementTransform(id, { x, y }, element ?? null);
    });
  }
}

export class AlignmentApplier {
  private containerMap: Record<string, string | null | undefined>;
  private zoomLevel: number;
  private scheduleHistoryCommit: (label?: string) => void;
  private writer: AlignmentTransformWriter;

  constructor({
    containerMap,
    zoomLevel,
    scheduleHistoryCommit,
    writer,
  }: {
    containerMap: Record<string, string | null | undefined>;
    zoomLevel: number;
    scheduleHistoryCommit: (label?: string) => void;
    writer: AlignmentTransformWriter;
  }) {
    this.containerMap = containerMap;
    this.zoomLevel = zoomLevel;
    this.scheduleHistoryCommit = scheduleHistoryCommit;
    this.writer = writer;
  }

  apply(
    deltas: AlignmentDelta[],
    elementMap: Map<string, HTMLElement>,
    elementTransforms: Record<string, ElementTransform> = {}
  ) {
    if (!deltas.length) {
      return;
    }
    const scaleResolver = new AlignmentScaleResolver({
      containerMap: this.containerMap,
      elementTransforms,
      zoomLevel: this.zoomLevel,
    });
    const updates: AlignmentUpdate[] = [];
    deltas.forEach(({ id, deltaX, deltaY }) => {
      const base = normalizeTransform(elementTransforms[id]);
      const scale = scaleResolver.getScale(id);
      const nextX = roundValue(base.x + deltaX / scale.x);
      const nextY = roundValue(base.y + deltaY / scale.y);
      if (Math.abs(nextX - base.x) < 0.01 && Math.abs(nextY - base.y) < 0.01) {
        return;
      }
      updates.push({
        id,
        x: nextX,
        y: nextY,
        element: elementMap.get(id) ?? null,
      });
    });
    if (!updates.length) {
      return;
    }
    this.writer.apply(updates);
    this.scheduleHistoryCommit("Align");
  }
}
