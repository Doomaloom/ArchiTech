import { roundValue } from "../../../_lib/geometry";
import type { ElementTransform } from "../../../_lib/iteration-types";

import { normalizeTransform } from "./constants";
import { getTextSnapshot, getTransformTextElement } from "./dom";
import type { TextStyleUpdate } from "./transform-tools";

export interface NestedScaleUpdate {
  transformUpdates: Record<string, ElementTransform>;
  textStyleUpdates: Record<string, TextStyleUpdate>;
  domUpdates: Array<{ id: string; element: HTMLElement; transform: ElementTransform }>;
}

interface ScaleDelta {
  deltaX: number;
  deltaY: number;
  fontScale: number;
}

interface NestedScaleManagerOptions {
  getTextStyles: (id: string) => TextStyleUpdate | null;
}

const EMPTY_UPDATES: NestedScaleUpdate = {
  transformUpdates: {},
  textStyleUpdates: {},
  domUpdates: [],
};

export class NestedTextScaleManager {
  private getTextStyles: (id: string) => TextStyleUpdate | null;

  constructor({ getTextStyles }: NestedScaleManagerOptions) {
    this.getTextStyles = getTextStyles;
  }

  private getNestedTextTargets(container: HTMLElement | null) {
    if (!container) {
      return [];
    }
    return Array.from(container.querySelectorAll<HTMLElement>("[data-gem-id]"))
      .filter(
        (element) => element !== container && getTransformTextElement(element)
      )
      .map((element) => ({
        id: element.dataset?.gemId,
        element,
      }))
      .filter((entry) => Boolean(entry.id));
  }

  private computeScaleDelta(
    currentTransform: ElementTransform,
    nextTransform: Partial<ElementTransform>
  ): ScaleDelta | null {
    const hasScale =
      nextTransform.scaleX != null || nextTransform.scaleY != null;
    if (!hasScale) {
      return null;
    }
    const currentScaleX = currentTransform.scaleX || 1;
    const currentScaleY = currentTransform.scaleY || 1;
    const nextScaleX = nextTransform.scaleX ?? currentScaleX;
    const nextScaleY = nextTransform.scaleY ?? currentScaleY;
    if (
      !Number.isFinite(currentScaleX) ||
      !Number.isFinite(currentScaleY) ||
      !Number.isFinite(nextScaleX) ||
      !Number.isFinite(nextScaleY) ||
      !currentScaleX ||
      !currentScaleY
    ) {
      return null;
    }
    const deltaX = nextScaleX / currentScaleX;
    const deltaY = nextScaleY / currentScaleY;
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      return null;
    }
    if (Math.abs(deltaX - 1) < 0.001 && Math.abs(deltaY - 1) < 0.001) {
      return null;
    }
    const fontScale = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
    return { deltaX, deltaY, fontScale };
  }

  buildUpdates({
    container,
    currentTransform,
    nextTransform,
    elementTransforms,
  }: {
    container: HTMLElement | null;
    currentTransform: ElementTransform;
    nextTransform: Partial<ElementTransform>;
    elementTransforms: Record<string, ElementTransform>;
  }): NestedScaleUpdate {
    const targets = this.getNestedTextTargets(container);
    if (!targets.length) {
      return EMPTY_UPDATES;
    }
    const delta = this.computeScaleDelta(currentTransform, nextTransform);
    if (!delta) {
      return EMPTY_UPDATES;
    }
    const transformUpdates: Record<string, ElementTransform> = {};
    const textStyleUpdates: Record<string, TextStyleUpdate> = {};
    const domUpdates: Array<{
      id: string;
      element: HTMLElement;
      transform: ElementTransform;
    }> = [];

    targets.forEach(({ id, element }) => {
      if (!id) {
        return;
      }
      const currentChild = normalizeTransform(elementTransforms[id]);
      const nextChild = {
        ...currentChild,
        scaleX: currentChild.scaleX / delta.deltaX,
        scaleY: currentChild.scaleY / delta.deltaY,
      };
      transformUpdates[id] = nextChild;
      domUpdates.push({ id, element, transform: nextChild });
      const baseFontSize =
        this.getTextStyles(id)?.fontSize ?? getTextSnapshot(element)?.fontSize ?? 16;
      textStyleUpdates[id] = {
        fontSize: roundValue(baseFontSize * delta.fontScale),
      };
    });

    return { transformUpdates, textStyleUpdates, domUpdates };
  }
}
