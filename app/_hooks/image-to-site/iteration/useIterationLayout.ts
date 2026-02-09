import { useEffect, useState } from "react";

export default function useIterationLayout({
  isIterationMode,
  iterationPreviewRef,
  iterationSiteRef,
}) {
  const [iterationSize, setIterationSize] = useState({ width: 0, height: 0 });
  const [siteBounds, setSiteBounds] = useState({ width: 0, height: 0 });
  const [baseLayout, setBaseLayout] = useState(() => ({}));

  useEffect(() => {
    if (!isIterationMode || !iterationPreviewRef.current) {
      return;
    }
    const element = iterationPreviewRef.current;
    const updateSize = () => {
      setIterationSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, [isIterationMode, iterationPreviewRef]);

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    if (Object.keys(baseLayout).length) {
      return;
    }
    const container = iterationSiteRef.current;
    const containerRect = container.getBoundingClientRect();
    setSiteBounds({
      width: containerRect.width,
      height: containerRect.height,
    });
    const elements = Array.from(
      container.querySelectorAll("[data-gem-id]")
    ) as HTMLElement[];
    const nextLayout: Record<string, any> = {};
    const orderByParent: Record<string, string[]> = {};

    elements.forEach((element) => {
      const id = element.dataset.gemId;
      if (!id) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const parentElement = element.parentElement?.closest(
        "[data-gem-id]"
      ) as HTMLElement | null;
      const parentId = parentElement?.dataset?.gemId ?? "root";
      const folderId = element.dataset?.gemFolder ?? null;
      const folderName = element.dataset?.gemFolderName ?? null;
      const folderParentFlag = element.dataset?.gemFolderParent;
      const folderParent =
        folderParentFlag != null && folderParentFlag !== "false";
      if (!orderByParent[parentId]) {
        orderByParent[parentId] = [];
      }
      orderByParent[parentId].push(id);
      nextLayout[id] = {
        id,
        parentId,
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || "").trim().slice(0, 140),
        folderId,
        folderName,
        folderParent,
        base: {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    });

    Object.entries(orderByParent).forEach(([, ids]) => {
      ids.forEach((id, index) => {
        if (nextLayout[id]) {
          nextLayout[id].order = index;
        }
      });
    });

    setBaseLayout(nextLayout);
  }, [baseLayout, isIterationMode, iterationSiteRef]);

  return {
    state: { iterationSize, siteBounds, baseLayout },
  };
}
