export type AlignmentCommand =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export interface AlignmentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AlignmentTarget {
  id: string;
  rect: AlignmentRect;
}

export interface AlignmentDelta {
  id: string;
  deltaX: number;
  deltaY: number;
}

abstract class AlignmentRule {
  readonly id: AlignmentCommand;
  readonly axis: "x" | "y";

  constructor(id: AlignmentCommand, axis: "x" | "y") {
    this.id = id;
    this.axis = axis;
  }

  protected abstract getTargetAnchor(rect: AlignmentRect): number;
  protected abstract getContainerAnchor(rect: AlignmentRect): number;

  apply(target: AlignmentRect, container: AlignmentRect) {
    const delta = this.getContainerAnchor(container) - this.getTargetAnchor(target);
    return {
      deltaX: this.axis === "x" ? delta : 0,
      deltaY: this.axis === "y" ? delta : 0,
    };
  }
}

abstract class HorizontalAlignmentRule extends AlignmentRule {
  constructor(id: AlignmentCommand) {
    super(id, "x");
  }
}

abstract class VerticalAlignmentRule extends AlignmentRule {
  constructor(id: AlignmentCommand) {
    super(id, "y");
  }
}

class AlignLeftRule extends HorizontalAlignmentRule {
  constructor() {
    super("left");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.left;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.left;
  }
}

class AlignCenterRule extends HorizontalAlignmentRule {
  constructor() {
    super("center");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.left + rect.width / 2;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.left + rect.width / 2;
  }
}

class AlignRightRule extends HorizontalAlignmentRule {
  constructor() {
    super("right");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.left + rect.width;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.left + rect.width;
  }
}

class AlignTopRule extends VerticalAlignmentRule {
  constructor() {
    super("top");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.top;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.top;
  }
}

class AlignMiddleRule extends VerticalAlignmentRule {
  constructor() {
    super("middle");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.top + rect.height / 2;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.top + rect.height / 2;
  }
}

class AlignBottomRule extends VerticalAlignmentRule {
  constructor() {
    super("bottom");
  }

  protected getTargetAnchor(rect: AlignmentRect) {
    return rect.top + rect.height;
  }

  protected getContainerAnchor(rect: AlignmentRect) {
    return rect.top + rect.height;
  }
}

export class AlignmentEngine {
  private rules = new Map<AlignmentCommand, AlignmentRule>();

  constructor(rules: AlignmentRule[]) {
    rules.forEach((rule) => this.rules.set(rule.id, rule));
  }

  align(
    command: AlignmentCommand,
    containerRect: AlignmentRect,
    targets: AlignmentTarget[]
  ): AlignmentDelta[] {
    const rule = this.rules.get(command);
    if (!rule) {
      return [];
    }
    return targets.map((target) => {
      const { deltaX, deltaY } = rule.apply(target.rect, containerRect);
      return { id: target.id, deltaX, deltaY };
    });
  }
}

export const createAlignmentEngine = () =>
  new AlignmentEngine([
    new AlignLeftRule(),
    new AlignCenterRule(),
    new AlignRightRule(),
    new AlignTopRule(),
    new AlignMiddleRule(),
    new AlignBottomRule(),
  ]);
