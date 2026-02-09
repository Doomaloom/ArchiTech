export const buildChildrenByParent = (
  layerParentMap: Record<string, string | null | undefined> | null | undefined
) =>
  Object.entries(layerParentMap ?? {}).reduce<Record<string, string[]>>(
    (acc, [childId, parentId]) => {
      if (typeof parentId !== "string" || !parentId) return acc;
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(childId);
      return acc;
    },
    {}
  );

type TransformValue = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  [key: string]: unknown;
};

type SizeValue = {
  width: number;
  height: number;
};

export const getPixelScale = (zoomLevel, scale) =>
  1 / ((zoomLevel || 1) * (scale || 1));

export const sizeDeltaExceeded = (current, next) =>
  Math.abs((current?.width ?? 0) - next.width) > 0.5 ||
  Math.abs((current?.height ?? 0) - next.height) > 0.5;

export const transformDeltaExceeded = (current, next) =>
  Math.abs(current.x - next.x) > 0.1 || Math.abs(current.y - next.y) > 0.1;

export const computeNestedSizingUpdates = ({
  site,
  childrenByParent,
  elementTransforms,
  zoomLevel,
  normalizeTransform,
  skipParents,
}: {
  site: ParentNode;
  childrenByParent: Record<string, string[]>;
  elementTransforms: Record<string, unknown>;
  zoomLevel: number;
  normalizeTransform: (value: unknown) => TransformValue;
  skipParents?: Set<string>;
}) => {
  const sizeUpdates: Record<string, SizeValue> = {};
  const transformUpdates: Record<string, TransformValue> = {};
  const childTransformUpdates: Record<string, TransformValue> = {};

  Object.entries(childrenByParent).forEach(([parentId, childIds]) => {
    if (skipParents?.has(parentId)) return;
    const parentElement = site.querySelector(`[data-gem-id="${parentId}"]`);
    if (!parentElement || !childIds?.length) return;
    const parentRect = parentElement.getBoundingClientRect();
    const parentTransform = normalizeTransform(elementTransforms[parentId]);
    const pixelScaleX = getPixelScale(zoomLevel, parentTransform.scaleX);
    const pixelScaleY = getPixelScale(zoomLevel, parentTransform.scaleY);

    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxBottom = -Infinity;
    const nestedChildIds: string[] = [];

    childIds.forEach((childId) => {
      const childElement = site.querySelector(`[data-gem-id="${childId}"]`);
      if (!childElement) return;
      if (!parentElement.contains(childElement)) return;
      nestedChildIds.push(childId);
      const childRect = childElement.getBoundingClientRect();
      minLeft = Math.min(minLeft, childRect.left);
      maxRight = Math.max(maxRight, childRect.right);
      minTop = Math.min(minTop, childRect.top);
      maxBottom = Math.max(maxBottom, childRect.bottom);
    });

    if (!Number.isFinite(minLeft)) return;

    const leftOverflow = Math.max(0, parentRect.left - minLeft) * pixelScaleX;
    const rightOverflow = Math.max(0, maxRight - parentRect.right) * pixelScaleX;
    const topOverflow = Math.max(0, parentRect.top - minTop) * pixelScaleY;
    const bottomOverflow =
      Math.max(0, maxBottom - parentRect.bottom) * pixelScaleY;

    if (!leftOverflow && !rightOverflow && !topOverflow && !bottomOverflow) {
      return;
    }

    const parentWidth = parentRect.width * pixelScaleX;
    const parentHeight = parentRect.height * pixelScaleY;
    sizeUpdates[parentId] = {
      width: parentWidth + leftOverflow + rightOverflow,
      height: parentHeight + topOverflow + bottomOverflow,
    };

    if (leftOverflow || topOverflow) {
      const nextTransform = {
        ...parentTransform,
        x: parentTransform.x - leftOverflow,
        y: parentTransform.y - topOverflow,
      };
      if (transformDeltaExceeded(parentTransform, nextTransform)) {
        transformUpdates[parentId] = nextTransform;
      }
      nestedChildIds.forEach((childId) => {
        const currentTransform = normalizeTransform(
          childTransformUpdates[childId] ?? elementTransforms[childId]
        );
        const nextChildTransform = {
          ...currentTransform,
          x: currentTransform.x + leftOverflow,
          y: currentTransform.y + topOverflow,
        };
        if (transformDeltaExceeded(currentTransform, nextChildTransform)) {
          childTransformUpdates[childId] = nextChildTransform;
        }
      });
    }
  });

  return {
    sizeUpdates,
    transformUpdates: {
      ...transformUpdates,
      ...childTransformUpdates,
    },
  };
};
