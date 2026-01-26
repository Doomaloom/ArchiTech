import { useEffect, useMemo, useState } from "react";

export default function useIterationLayersState({
  isIterationMode,
  baseLayout,
  scheduleHistoryCommit,
  selectionApiRef,
}) {
  const [layerState, setLayerState] = useState(() => ({}));
  const [layerFolders, setLayerFolders] = useState(() => ({}));
  const [layerFolderOrder, setLayerFolderOrder] = useState(() => []);
  const [deletedLayerIds, setDeletedLayerIds] = useState(() => []);
  const [highlightedIds, setHighlightedIds] = useState(() => []);

  useEffect(() => {
    if (!Object.keys(baseLayout).length) {
      return;
    }
    setLayerState((current) => {
      if (Object.keys(current).length) {
        return current;
      }
      const nextLayers = {};
      Object.values(baseLayout).forEach((entry) => {
        const label = entry.text || entry.id;
        nextLayers[entry.id] = {
          id: entry.id,
          name: label.slice(0, 48),
          locked: false,
          hidden: false,
        };
      });
      return nextLayers;
    });
  }, [baseLayout]);

  useEffect(() => {
    if (!Object.keys(baseLayout).length) {
      return;
    }
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter((id) => baseLayout[id]);
        if (filtered.length !== (folder.layerIds ?? []).length) {
          changed = true;
        }
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      return changed ? next : current;
    });
  }, [baseLayout]);

  useEffect(() => {
    if (isIterationMode) {
      return;
    }
    setLayerFolders({});
    setLayerFolderOrder([]);
  }, [isIterationMode]);

  const getLayerMeta = (id) => {
    if (layerState[id]) {
      return layerState[id];
    }
    const fallback = baseLayout[id];
    const label = fallback?.text || id;
    return {
      id,
      name: label?.slice(0, 48) || id,
      locked: false,
      hidden: false,
    };
  };

  const deletedLayerSet = useMemo(
    () => new Set(deletedLayerIds),
    [deletedLayerIds]
  );

  const isLayerLocked = (id) => getLayerMeta(id).locked;
  const isLayerHidden = (id) => getLayerMeta(id).hidden;
  const isLayerDeleted = (id) => deletedLayerSet.has(id);

  const toggleHighlight = (id) => {
    setHighlightedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    );
  };

  const handleToggleLayerVisibility = (id) => {
    scheduleHistoryCommit("Layer");
    setLayerState((current) => {
      const layer = current[id] ?? { id, name: id, locked: false, hidden: false };
      const nextLayer = { ...layer, hidden: !layer.hidden };
      const next = { ...current, [id]: nextLayer };
      if (nextLayer.hidden) {
        const selectionApi = selectionApiRef.current;
        if (selectionApi?.removeSelectionIds) {
          selectionApi.removeSelectionIds([id]);
        }
        setHighlightedIds((currentHighlights) =>
          currentHighlights.filter((entry) => entry !== id)
        );
      }
      return next;
    });
  };

  const handleToggleLayerLock = (id) => {
    scheduleHistoryCommit("Layer");
    setLayerState((current) => {
      const layer = current[id] ?? { id, name: id, locked: false, hidden: false };
      return { ...current, [id]: { ...layer, locked: !layer.locked } };
    });
  };

  const handleCreateLayerFolder = () => {
    scheduleHistoryCommit("Layer");
    const folderId = `folder-${Date.now()}`;
    const selected = selectionApiRef.current?.getSelectedIds?.() ?? [];
    const selectedSet = new Set(selected);
    setLayerFolders((current) => {
      const folderName = `Folder ${Object.keys(current).length + 1}`;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      next[folderId] = {
        id: folderId,
        name: folderName,
        layerIds: selected,
        collapsed: false,
      };
      return next;
    });
    setLayerFolderOrder((current) => [folderId, ...current]);
  };

  const handleRenameLayerFolder = (folderId, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      const folder = current[folderId];
      if (!folder || folder.name === trimmed) {
        return current;
      }
      return { ...current, [folderId]: { ...folder, name: trimmed } };
    });
  };

  const handleRemoveLayerFolder = (folderId) => {
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      if (!current[folderId]) {
        return current;
      }
      const next = { ...current };
      delete next[folderId];
      return next;
    });
    setLayerFolderOrder((current) =>
      current.filter((entry) => entry !== folderId)
    );
  };

  const handleToggleLayerFolderCollapsed = (folderId) => {
    scheduleHistoryCommit("Layer");
    setLayerFolders((current) => {
      const folder = current[folderId];
      if (!folder) {
        return current;
      }
      return {
        ...current,
        [folderId]: { ...folder, collapsed: !folder.collapsed },
      };
    });
  };

  const handleAddSelectionToFolder = (folderId) => {
    const selected = selectionApiRef.current?.getSelectedIds?.() ?? [];
    if (!selected.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const selectedSet = new Set(selected);
    setLayerFolders((current) => {
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      const target = next[folderId];
      if (!target) {
        return current;
      }
      const combined = Array.from(
        new Set([...(target.layerIds ?? []), ...selected])
      );
      next[folderId] = { ...target, layerIds: combined };
      return next;
    });
  };

  const handleToggleLayerFolderVisibility = (folderId) => {
    const folder = layerFolders[folderId];
    if (!folder?.layerIds?.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const layerIds = folder.layerIds;
    const shouldHide = layerIds.some((id) => !isLayerHidden(id));
    setLayerState((current) => {
      const next = { ...current };
      layerIds.forEach((id) => {
        const layer = current[id] ?? {
          id,
          name: id,
          locked: false,
          hidden: false,
        };
        next[id] = { ...layer, hidden: shouldHide };
      });
      return next;
    });
    if (shouldHide) {
      const selectionApi = selectionApiRef.current;
      if (selectionApi?.removeSelectionIds) {
        selectionApi.removeSelectionIds(layerIds);
      }
      setHighlightedIds((current) =>
        current.filter((id) => !layerIds.includes(id))
      );
    }
  };

  const handleToggleLayerFolderLock = (folderId) => {
    const folder = layerFolders[folderId];
    if (!folder?.layerIds?.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const layerIds = folder.layerIds;
    const shouldLock = layerIds.some((id) => !isLayerLocked(id));
    setLayerState((current) => {
      const next = { ...current };
      layerIds.forEach((id) => {
        const layer = current[id] ?? {
          id,
          name: id,
          locked: false,
          hidden: false,
        };
        next[id] = { ...layer, locked: shouldLock };
      });
      return next;
    });
  };

  const deleteLayers = (ids) => {
    if (!ids.length) {
      return;
    }
    setDeletedLayerIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
    setHighlightedIds((current) =>
      current.filter((id) => !ids.includes(id))
    );
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !ids.includes(layerId)
        );
        if (filtered.length !== (folder.layerIds ?? []).length) {
          changed = true;
        }
        next[folder.id] = { ...folder, layerIds: filtered };
      });
      return changed ? next : current;
    });
    setLayerState((current) => {
      let changed = false;
      const next = { ...current };
      ids.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  };

  const layerEntries = useMemo(() => {
    return Object.values(baseLayout)
      .filter((entry) => !isLayerDeleted(entry.id))
      .map((entry) => ({
        id: entry.id,
        order: entry.order ?? 0,
        parentId: entry.parentId,
        layer: getLayerMeta(entry.id),
      }))
      .sort((a, b) => a.order - b.order);
  }, [baseLayout, deletedLayerIds, layerState]);

  const { layerFolderEntries, ungroupedLayerEntries } = useMemo(() => {
    const entryMap = {};
    layerEntries.forEach((entry) => {
      entryMap[entry.id] = entry;
    });
    const groupedIds = new Set();
    const folders = layerFolderOrder
      .map((id, index) => {
        const folder = layerFolders[id];
        if (!folder) {
          return null;
        }
        const layers = (folder.layerIds ?? [])
          .map((layerId) => entryMap[layerId])
          .filter(Boolean);
        layers.forEach((layer) => groupedIds.add(layer.id));
        const allHidden =
          layers.length > 0 && layers.every((layer) => layer.layer.hidden);
        const allLocked =
          layers.length > 0 && layers.every((layer) => layer.layer.locked);
        return {
          id: folder.id,
          name: folder.name,
          collapsed: Boolean(folder.collapsed),
          layers,
          hidden: allHidden,
          locked: allLocked,
          order: folder.order ?? index,
        };
      })
      .filter(Boolean);

    const ungrouped = layerEntries.filter((entry) => !groupedIds.has(entry.id));
    return { layerFolderEntries: folders, ungroupedLayerEntries: ungrouped };
  }, [layerEntries, layerFolderOrder, layerFolders]);

  return {
    state: {
      layerState,
      layerFolders,
      layerFolderOrder,
      deletedLayerIds,
      highlightedIds,
    },
    derived: {
      layerEntries,
      layerFolderEntries,
      ungroupedLayerEntries,
    },
    helpers: {
      getLayerMeta,
      isLayerLocked,
      isLayerHidden,
      isLayerDeleted,
    },
    actions: {
      toggleHighlight,
      handleToggleLayerVisibility,
      handleToggleLayerLock,
      handleCreateLayerFolder,
      handleRenameLayerFolder,
      handleRemoveLayerFolder,
      handleToggleLayerFolderCollapsed,
      handleAddSelectionToFolder,
      handleToggleLayerFolderVisibility,
      handleToggleLayerFolderLock,
      deleteLayers,
      setLayerState,
      setLayerFolders,
      setLayerFolderOrder,
      setDeletedLayerIds,
      setHighlightedIds,
    },
  };
}
