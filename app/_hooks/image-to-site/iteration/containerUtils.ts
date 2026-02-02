import type { ContainerMap, LayoutMap } from "../../../_lib/iteration-types";

const getElementById = (site: HTMLElement | null, id: string) =>
  site?.querySelector(`[data-gem-id="${id}"]`) ?? null;

export const buildContainerMap = ({
  site,
  layerParentMap,
  detachedIds,
}: {
  site: HTMLElement | null;
  layerParentMap: Record<string, string | null | undefined> | null | undefined;
  detachedIds?: string[];
}): ContainerMap => {
  if (!site || !layerParentMap) {
    return {};
  }
  const detachedSet = new Set(detachedIds ?? []);
  const next: ContainerMap = {};
  Object.entries(layerParentMap).forEach(([childId, parentId]) => {
    if (!parentId || detachedSet.has(childId)) {
      return;
    }
    const parentElement = getElementById(site, parentId);
    const childElement = getElementById(site, childId);
    if (!parentElement || !childElement) {
      return;
    }
    if (!parentElement.contains(childElement)) {
      return;
    }
    next[childId] = parentId;
  });
  return next;
};

export const buildContainerLayout = ({
  baseLayout,
  containerMap,
  detachedIds,
}: {
  baseLayout: LayoutMap;
  containerMap: ContainerMap;
  detachedIds?: string[];
}): LayoutMap => {
  if (!Object.keys(baseLayout).length) {
    return baseLayout;
  }
  const detachedSet = new Set(detachedIds ?? []);
  const next: LayoutMap = {};
  Object.values(baseLayout).forEach((entry) => {
    const parentId = detachedSet.has(entry.id)
      ? "root"
      : containerMap[entry.id] ?? "root";
    next[entry.id] =
      entry.parentId === parentId ? entry : { ...entry, parentId };
  });
  return next;
};

export const resolveContainedParentId = (
  site: HTMLElement | null,
  selectedIds: string[]
) => {
  if (!site || selectedIds.length < 2) {
    return null;
  }
  const entries = selectedIds
    .map((id) => ({ id, element: getElementById(site, id) }))
    .filter((entry) => entry.element);
  if (entries.length < 2) {
    return null;
  }
  for (const entry of entries) {
    const isContainer = entries.every(
      (candidate) =>
        candidate.id === entry.id ||
        entry.element?.contains(candidate.element)
    );
    if (isContainer) {
      return entry.id;
    }
  }
  return null;
};
