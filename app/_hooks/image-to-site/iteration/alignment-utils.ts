import type { LayoutMap } from "../../../_lib/iteration-types";
import type { AlignmentTarget } from "./alignment-engine";

export const getRect = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
};

export const filterAlignableIds = (ids, helpers) =>
  (ids ?? []).filter(
    (id) =>
      id &&
      !helpers.isLayerHidden(id) &&
      !helpers.isLayerLocked(id) &&
      !helpers.isLayerDeleted(id)
  );

export const buildAlignmentTargets = (site: HTMLElement, ids: string[]) => {
  const targets: AlignmentTarget[] = [];
  const elementMap = new Map<string, HTMLElement>();
  ids.forEach((id) => {
    const element = site.querySelector<HTMLElement>(`[data-gem-id="${id}"]`);
    if (!element) {
      return;
    }
    targets.push({ id, rect: getRect(element) });
    elementMap.set(id, element);
  });
  return { targets, elementMap };
};

export const resolveAlignmentScopeLabel = (scopeId: string, layout: LayoutMap) => {
  if (scopeId === "root") {
    return "Page";
  }
  const entry = layout?.[scopeId];
  return entry?.text || entry?.id || "Container";
};

const buildAncestorChain = (element: HTMLElement | null, root: HTMLElement) => {
  const chain: HTMLElement[] = [];
  let current: HTMLElement | null = element;
  while (current) {
    chain.push(current);
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  return chain;
};

const findCommonAncestorElement = (
  site: HTMLElement,
  elements: HTMLElement[],
  skipElements = new Set<HTMLElement>()
) => {
  if (!elements.length) {
    return site;
  }
  const chains = elements.map((element) =>
    buildAncestorChain(element, site)
  );
  const [first, ...rest] = chains;
  for (const candidate of first) {
    if (skipElements.has(candidate)) {
      continue;
    }
    if (candidate === site) {
      return site;
    }
    const isCommon = rest.every((chain) => chain.includes(candidate));
    if (isCommon) {
      return candidate;
    }
  }
  return site;
};

export const resolveAlignmentContainerElement = ({
  site,
  containerId,
  elementMap,
  alignableIds,
}: {
  site: HTMLElement | null;
  containerId: string;
  elementMap: Map<string, HTMLElement>;
  alignableIds: string[];
}) => {
  if (!site) {
    return null;
  }
  if (containerId === "root") {
    return site;
  }
  const layoutElement = site.querySelector<HTMLElement>(
    `[data-gem-id="${containerId}"]`
  );
  if (layoutElement) {
    return layoutElement;
  }
  const elements = alignableIds
    .map((id) => elementMap.get(id))
    .filter((element): element is HTMLElement => Boolean(element));
  const skipElements = new Set(elements);
  return findCommonAncestorElement(site, elements, skipElements);
};
