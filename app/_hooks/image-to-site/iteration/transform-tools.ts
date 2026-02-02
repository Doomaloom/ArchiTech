import { roundValue } from "../../../_lib/geometry";
import type { ElementTransform } from "../../../_lib/iteration-types";

import { getTextSnapshot, getTransformTextElement } from "./dom";

export interface TextStyleUpdate {
  fontSize?: number;
}

export interface TransformApplyInput {
  id: string;
  target: HTMLElement | null;
  currentTransform: ElementTransform;
  nextTransform: Partial<ElementTransform>;
  textStyles?: TextStyleUpdate | null;
}

export interface TransformApplyResult {
  transform: ElementTransform;
  textStyles?: TextStyleUpdate;
}

export interface TransformControlInput {
  id: string;
  target: HTMLElement | null;
  currentTransform: ElementTransform;
  textStyles?: TextStyleUpdate | null;
}

export type TransformControlState =
  | {
      kind: "text";
      fontSize: number | null;
    }
  | {
      kind: "object";
      scaleXPercent: number;
      scaleYPercent: number;
    };

export interface TransformTool {
  supports(target: HTMLElement | null): boolean;
  applyTransform(input: TransformApplyInput): TransformApplyResult;
  getControlState(input: TransformControlInput): TransformControlState | null;
  beginScale?(id: string, target: HTMLElement | null, textStyles?: TextStyleUpdate | null): void;
  endScale?(id: string): void;
}

class TextScaleTracker {
  private entries = new Map<
    string,
    { scaleX: number; scaleY: number; fontSize: number }
  >();

  begin(id: string, fontSize: number) {
    this.entries.set(id, { scaleX: 1, scaleY: 1, fontSize });
  }

  apply(id: string, scaleX: number, scaleY: number, fallbackFontSize: number) {
    const current =
      this.entries.get(id) ?? {
        scaleX: 1,
        scaleY: 1,
        fontSize: fallbackFontSize,
      };
    const deltaX = scaleX / (current.scaleX || 1);
    const deltaY = scaleY / (current.scaleY || 1);
    const delta = (deltaX + deltaY) / 2;
    const nextFontSize = current.fontSize * delta;
    this.entries.set(id, {
      scaleX,
      scaleY,
      fontSize: nextFontSize,
    });
    return nextFontSize;
  }

  end(id: string) {
    this.entries.delete(id);
  }
}

abstract class BaseTransformTool implements TransformTool {
  abstract supports(target: HTMLElement | null): boolean;

  applyTransform(input: TransformApplyInput): TransformApplyResult {
    const transform = {
      ...input.currentTransform,
      ...input.nextTransform,
    };
    return { transform };
  }

  getControlState(_input: TransformControlInput): TransformControlState | null {
    return null;
  }
}

export class ObjectTransformTool extends BaseTransformTool {
  supports() {
    return true;
  }

  getControlState(input: TransformControlInput): TransformControlState {
    return {
      kind: "object",
      scaleXPercent: roundValue(input.currentTransform.scaleX * 100),
      scaleYPercent: roundValue(input.currentTransform.scaleY * 100),
    };
  }
}

export class TextTransformTool extends BaseTransformTool {
  private scaleTracker = new TextScaleTracker();

  supports(target: HTMLElement | null) {
    return Boolean(getTransformTextElement(target));
  }

  beginScale(id: string, target: HTMLElement | null, textStyles?: TextStyleUpdate | null) {
    const element = getTransformTextElement(target);
    const snapshot = element ? getTextSnapshot(element) : null;
    const fontSize = textStyles?.fontSize ?? snapshot?.fontSize ?? 16;
    this.scaleTracker.begin(id, fontSize);
  }

  endScale(id: string) {
    this.scaleTracker.end(id);
  }

  applyTransform(input: TransformApplyInput): TransformApplyResult {
    const merged = {
      ...input.currentTransform,
      ...input.nextTransform,
    };
    const hasScale =
      input.nextTransform.scaleX != null || input.nextTransform.scaleY != null;

    if (!hasScale) {
      return { transform: merged };
    }

    const scaleX = input.nextTransform.scaleX ?? merged.scaleX ?? 1;
    const scaleY = input.nextTransform.scaleY ?? merged.scaleY ?? 1;
    const element = getTransformTextElement(input.target);
    const snapshot = element ? getTextSnapshot(element) : null;
    const baseFontSize = input.textStyles?.fontSize ?? snapshot?.fontSize ?? 16;
    const nextFontSize = this.scaleTracker.apply(
      input.id,
      scaleX,
      scaleY,
      baseFontSize
    );

    return {
      transform: {
        ...merged,
        scaleX: input.currentTransform.scaleX,
        scaleY: input.currentTransform.scaleY,
      },
      textStyles: {
        fontSize: roundValue(nextFontSize),
      },
    };
  }

  getControlState(input: TransformControlInput): TransformControlState | null {
    const element = getTransformTextElement(input.target);
    if (!element) {
      return null;
    }
    const snapshot = getTextSnapshot(element);
    const fontSize = input.textStyles?.fontSize ?? snapshot?.fontSize ?? null;
    return {
      kind: "text",
      fontSize: fontSize == null ? null : roundValue(fontSize),
    };
  }
}

export class TransformEngine {
  private tools: TransformTool[];

  constructor(tools: TransformTool[]) {
    this.tools = tools;
  }

  private resolve(target: HTMLElement | null) {
    return this.tools.find((tool) => tool.supports(target)) ?? this.tools[0];
  }

  applyTransform(input: TransformApplyInput) {
    return this.resolve(input.target).applyTransform(input);
  }

  getControlState(input: TransformControlInput) {
    return this.resolve(input.target).getControlState(input);
  }

  beginScale(id: string, target: HTMLElement | null, textStyles?: TextStyleUpdate | null) {
    this.resolve(target).beginScale?.(id, target, textStyles);
  }

  endScale(id: string) {
    this.tools.forEach((tool) => tool.endScale?.(id));
  }
}

export const createTransformEngine = () =>
  new TransformEngine([new TextTransformTool(), new ObjectTransformTool()]);
