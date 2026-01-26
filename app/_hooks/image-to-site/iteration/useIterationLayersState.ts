import { useEffect, useMemo, useState } from "react";

const hasLayerIdsChanged = (prevIds, nextIds) => {
  if (prevIds.length !== nextIds.length) {
    return true;
  }
  return prevIds.some((id, index) => id !== nextIds[index]);
};

const resolveFolderParentId = (folder) => {
  const layerIds = folder?.layerIds ?? [];
  if (folder?.parentId && layerIds.includes(folder.parentId)) {
    return folder.parentId;
  }
  return layerIds[0] ?? null;
};

const formatFolderName = (value) => {
  if (!value) {
    return "";
  }
  return value
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const sanitizeFolder = (folder, validIds, fallbackParentId) => {
  const layerIds = (folder.layerIds ?? []).filter(
    (layerId) => !validIds || validIds.has(layerId)
  );
  let parentId = folder.parentId ?? fallbackParentId ?? null;
  if (parentId && !layerIds.includes(parentId)) {
    parentId = layerIds[0] ?? null;
  }
  if (!parentId && layerIds.length) {
    parentId = layerIds[0];
  }
  return {
    ...folder,
    layerIds,
    parentId,
  };
};

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
  const hasFolders = Object.keys(layerFolders).length > 0;

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
    const validIds = new Set(Object.keys(baseLayout));
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const sanitized = sanitizeFolder(folder, validIds);
        if (
          hasLayerIdsChanged(folder.layerIds ?? [], sanitized.layerIds) ||
          (folder.parentId ?? null) !== (sanitized.parentId ?? null)
        ) {
          changed = true;
        }
        next[folder.id] = sanitized;
      });
      return changed ? next : current;
    });
  }, [baseLayout]);

  useEffect(() => {
    if (!Object.keys(baseLayout).length) {
      return;
    }
    if (hasFolders || layerFolderOrder.length) {
      return;
    }
    const groups = new Map();
    Object.values(baseLayout).forEach((entry) => {
      if (!entry.folderId) {
        return;
      }
      const existing = groups.get(entry.folderId);
      const order = entry.order ?? 0;
      if (existing) {
        existing.layerIds.push(entry.id);
        existing.order = Math.min(existing.order, order);
        if (entry.folderParent) {
          existing.parentId = entry.id;
        }
        if (entry.folderName) {
          existing.name = entry.folderName;
        }
        return;
      }
      groups.set(entry.folderId, {
        id: `seed-${entry.folderId}`,
        name: entry.folderName ?? formatFolderName(entry.folderId),
        layerIds: [entry.id],
        parentId: entry.folderParent ? entry.id : null,
        order,
      });
    });

    if (!groups.size) {
      return;
    }
    const validIds = new Set(Object.keys(baseLayout));
    const seedFolders = {};
    const seedOrder = [];
    Array.from(groups.values())
      .sort((a, b) => a.order - b.order)
      .forEach((group, index) => {
        const fallbackName = group.name || `Folder ${index + 1}`;
        const sanitized = sanitizeFolder(
          {
            id: group.id,
            name: fallbackName,
            layerIds: group.layerIds,
            collapsed: false,
            parentId: group.parentId,
            order: group.order ?? index,
          },
          validIds,
          group.parentId
        );
        seedFolders[group.id] = sanitized;
        seedOrder.push(group.id);
      });

    setLayerFolders((current) =>
      Object.keys(current).length ? current : seedFolders
    );
    setLayerFolderOrder((current) =>
      current.length ? current : seedOrder
    );
  }, [baseLayout, hasFolders, layerFolderOrder.length]);

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
    const primaryId =
      selectionApiRef.current?.getPrimaryId?.() ?? selected[0] ?? null;
    const selectedSet = new Set(selected);
    setLayerFolders((current) => {
      const folderName = `Folder ${Object.keys(current).length + 1}`;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = sanitizeFolder({ ...folder, layerIds: filtered });
      });
      next[folderId] = sanitizeFolder(
        {
          id: folderId,
          name: folderName,
          layerIds: selected,
          collapsed: false,
          parentId: primaryId,
        },
        null,
        primaryId
      );
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
    const primaryId =
      selectionApiRef.current?.getPrimaryId?.() ?? selected[0] ?? null;
    setLayerFolders((current) => {
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !selectedSet.has(layerId)
        );
        next[folder.id] = sanitizeFolder({ ...folder, layerIds: filtered });
      });
      const target = next[folderId];
      if (!target) {
        return current;
      }
      const combined = Array.from(
        new Set([...(target.layerIds ?? []), ...selected])
      );
      const fallbackParent =
        target.parentId ?? (combined.includes(primaryId) ? primaryId : null);
      next[folderId] = sanitizeFolder(
        { ...target, layerIds: combined, parentId: fallbackParent },
        null,
        fallbackParent
      );
      return next;
    });
  };

  const unlinkLayersFromFolders = (ids) => {
    if (!ids?.length) {
      return;
    }
    scheduleHistoryCommit("Layer");
    const removalSet = new Set(ids);
    setLayerFolders((current) => {
      let changed = false;
      const next = {};
      Object.values(current).forEach((folder) => {
        const filtered = (folder.layerIds ?? []).filter(
          (layerId) => !removalSet.has(layerId)
        );
        const sanitized = sanitizeFolder({ ...folder, layerIds: filtered });
        if (
          hasLayerIdsChanged(folder.layerIds ?? [], sanitized.layerIds) ||
          (folder.parentId ?? null) !== (sanitized.parentId ?? null)
        ) {
          changed = true;
        }
        next[folder.id] = sanitized;
      });
      return changed ? next : current;
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
        const sanitized = sanitizeFolder({ ...folder, layerIds: filtered });
        if (
          hasLayerIdsChanged(folder.layerIds ?? [], sanitized.layerIds) ||
          (folder.parentId ?? null) !== (sanitized.parentId ?? null)
        ) {
          changed = true;
        }
        next[folder.id] = sanitized;
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

  const layerFolderMap = useMemo(() => {
    const map = {};
    Object.values(layerFolders).forEach((folder) => {
      (folder.layerIds ?? []).forEach((layerId) => {
        map[layerId] = folder.id;
      });
    });
    return map;
  }, [layerFolders]);

  const layerParentMap = useMemo(() => {
    const map = {};
    Object.values(layerFolders).forEach((folder) => {
      const parentId = resolveFolderParentId(folder);
      if (!parentId) {
        return;
      }
      (folder.layerIds ?? []).forEach((layerId) => {
        if (layerId !== parentId) {
          map[layerId] = parentId;
        }
      });
    });
    return map;
  }, [layerFolders]);

  const nestedLayerIds = useMemo(
    () => Object.keys(layerParentMap),
    [layerParentMap]
  );

  const getLayerFolderId = (id) => layerFolderMap[id] ?? null;
  const getLayerParentId = (id) => layerParentMap[id] ?? null;
  const isLayerNested = (id) => Boolean(layerParentMap[id]);

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
      layerParentMap,
      nestedLayerIds,
    },
    helpers: {
      getLayerMeta,
      isLayerLocked,
      isLayerHidden,
      isLayerDeleted,
      getLayerFolderId,
      getLayerParentId,
      isLayerNested,
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
      unlinkLayersFromFolders,
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
