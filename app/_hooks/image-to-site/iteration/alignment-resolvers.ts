import type { ElementTransform } from "../../../_lib/iteration-types";

import { normalizeTransform } from "./constants";

const ROOT_ID = "root";

const sanitizeScale = (value: number) => {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) {
    return 1;
  }
  return value;
};

export class AlignmentScopeResolver {
  private containerMap: Record<string, string | null | undefined>;

  constructor(containerMap?: Record<string, string | null | undefined>) {
    this.containerMap = containerMap ?? {};
  }

  resolve(ids: string[]) {
    if (!ids?.length) {
      return ROOT_ID;
    }
    const chains = ids.map((id) => this.getAncestorChain(id));
    const [first, ...rest] = chains;
    const common = first.find((candidate) =>
      rest.every((chain) => chain.includes(candidate))
    );
    return common ?? ROOT_ID;
  }

  private getAncestorChain(id: string) {
    const chain: string[] = [];
    let current = this.containerMap[id];
    while (current && current !== ROOT_ID) {
      chain.push(current);
      current = this.containerMap[current];
    }
    chain.push(ROOT_ID);
    return chain;
  }
}

export class AlignmentScaleResolver {
  private containerMap: Record<string, string | null | undefined>;
  private elementTransforms: Record<string, ElementTransform | undefined>;
  private zoomLevel: number;

  constructor({
    containerMap,
    elementTransforms,
    zoomLevel,
  }: {
    containerMap?: Record<string, string | null | undefined>;
    elementTransforms?: Record<string, ElementTransform | undefined>;
    zoomLevel?: number;
  }) {
    this.containerMap = containerMap ?? {};
    this.elementTransforms = elementTransforms ?? {};
    this.zoomLevel = sanitizeScale(zoomLevel ?? 1);
  }

  getScale(id: string) {
    let scaleX = this.zoomLevel;
    let scaleY = this.zoomLevel;
    let current = this.containerMap[id];
    while (current && current !== ROOT_ID) {
      const transform = normalizeTransform(this.elementTransforms[current]);
      scaleX *= sanitizeScale(transform.scaleX);
      scaleY *= sanitizeScale(transform.scaleY);
      current = this.containerMap[current];
    }
    return {
      x: sanitizeScale(scaleX),
      y: sanitizeScale(scaleY),
    };
  }
}
