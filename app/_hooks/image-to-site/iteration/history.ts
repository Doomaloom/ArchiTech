import { useEffect, useMemo, useRef, useState } from "react";

import { HISTORY_DEBOUNCE_MS, HISTORY_LIMIT } from "./constants";
import { isEditableTarget } from "./dom";

export const cloneHistorySnapshot = (snapshot) => {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot));
};

export const buildHistorySnapshot = ({
  elementTransforms,
  textEdits,
  annotations,
  layerState,
  layerFolders,
  layerFolderOrder,
  deletedLayerIds,
  highlightedIds,
}) => ({
  elementTransforms,
  textEdits,
  annotations,
  layerState,
  layerFolders,
  layerFolderOrder,
  deletedLayerIds,
  highlightedIds,
});

export const useIterationHistory = ({
  isIterationMode,
  baseLayout,
  snapshot,
  applySnapshot,
}) => {
  const [historyState, setHistoryState] = useState(() => ({
    past: [],
    present: null,
    future: [],
  }));
  const historyLockRef = useRef(false);
  const historyLabelRef = useRef("Edit");
  const historyTimerRef = useRef(null);

  const commitHistory = (label = "Edit") => {
    if (!isIterationMode || historyLockRef.current) {
      return;
    }
    const snapshotData = buildHistorySnapshot(snapshot);
    const signature = JSON.stringify(snapshotData);
    setHistoryState((current) => {
      if (current.present?.signature === signature) {
        return current;
      }
      const entry = {
        id: `history-${Date.now()}`,
        label,
        timestamp: new Date().toISOString(),
        snapshot: cloneHistorySnapshot(snapshotData),
        signature,
      };
      const nextPast = current.present
        ? [...current.past, current.present]
        : current.past;
      const trimmedPast = nextPast.slice(-HISTORY_LIMIT);
      return {
        past: trimmedPast,
        present: entry,
        future: [],
      };
    });
  };

  const scheduleHistoryCommit = (label?: string) => {
    if (!isIterationMode || historyLockRef.current) {
      return;
    }
    if (label) {
      historyLabelRef.current = label;
    }
    const nextLabel = historyLabelRef.current || "Edit";
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = setTimeout(() => {
      commitHistory(nextLabel);
      historyLabelRef.current = "Edit";
    }, HISTORY_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!isIterationMode || !Object.keys(baseLayout).length) {
      return;
    }
    scheduleHistoryCommit();
    return () => {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
    };
  }, [
    snapshot.annotations,
    baseLayout,
    snapshot.deletedLayerIds,
    snapshot.elementTransforms,
    snapshot.highlightedIds,
    isIterationMode,
    snapshot.layerFolderOrder,
    snapshot.layerFolders,
    snapshot.layerState,
    snapshot.textEdits,
  ]);

  useEffect(() => {
    if (!isIterationMode) {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
      historyLockRef.current = false;
      historyLabelRef.current = "Edit";
      setHistoryState({ past: [], present: null, future: [] });
    }
  }, [isIterationMode]);

  const historyEntries = useMemo(() => {
    const entries = [...historyState.past];
    if (historyState.present) {
      entries.push(historyState.present);
    }
    return entries;
  }, [historyState]);

  const activeHistoryId = historyState.present?.id ?? null;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const handleUndoHistory = () => {
    let snapshotToApply = null;
    setHistoryState((current) => {
      if (!current.present || !current.past.length) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      snapshotToApply = previous.snapshot;
      const nextPast = current.past.slice(0, -1);
      return {
        past: nextPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    if (snapshotToApply) {
      historyLockRef.current = true;
      applySnapshot(snapshotToApply);
      queueMicrotask(() => {
        historyLockRef.current = false;
      });
    }
  };

  const handleRedoHistory = () => {
    let snapshotToApply = null;
    setHistoryState((current) => {
      if (!current.present || !current.future.length) {
        return current;
      }
      const nextEntry = current.future[0];
      snapshotToApply = nextEntry.snapshot;
      const nextPast = [...current.past, current.present].slice(-HISTORY_LIMIT);
      return {
        past: nextPast,
        present: nextEntry,
        future: current.future.slice(1),
      };
    });
    if (snapshotToApply) {
      historyLockRef.current = true;
      applySnapshot(snapshotToApply);
      queueMicrotask(() => {
        historyLockRef.current = false;
      });
    }
  };

  const handleClearHistory = () => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
    }
    setHistoryState({ past: [], present: null, future: [] });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isIterationMode) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndoHistory();
        return;
      }
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        handleRedoHistory();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedoHistory, handleUndoHistory, isIterationMode]);

  return {
    derived: { historyEntries, activeHistoryId, canUndo, canRedo },
    actions: {
      scheduleHistoryCommit,
      handleUndoHistory,
      handleRedoHistory,
      handleClearHistory,
    },
  };
};
