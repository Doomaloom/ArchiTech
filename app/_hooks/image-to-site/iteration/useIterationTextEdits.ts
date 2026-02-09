import { useEffect, useRef, useState } from "react";

import { getEditableTextElement, getTextSnapshot } from "./dom";

export default function useIterationTextEdits({
  isIterationMode,
  iterationTool,
  selectedElementId,
  iterationSiteRef,
  scheduleHistoryCommit,
}) {
  const [textEdits, setTextEdits] = useState<Record<string, any>>(() => ({}));
  const [textEditDraft, setTextEditDraft] = useState<any>(null);
  const textBaseRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!isIterationMode || !iterationSiteRef.current) {
      return;
    }
    const container = iterationSiteRef.current;
    const editedIds = new Set<string>(Object.keys(textEdits));

    Object.entries(textEdits as Record<string, any>).forEach(([id, entry]) => {
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      if (!element) {
        return;
      }
      if (!textBaseRef.current[id]) {
        const snapshot = getTextSnapshot(element);
        if (snapshot) {
          textBaseRef.current[id] = snapshot;
        }
      }
      const styles = entry?.styles ?? {};
      if (typeof entry?.text === "string") {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.value = entry.text;
        } else {
          element.textContent = entry.text;
        }
      }
      if (styles.fontSize != null) {
        element.style.fontSize = `${styles.fontSize}px`;
      }
      if (styles.lineHeight != null) {
        element.style.lineHeight = `${styles.lineHeight}`;
      }
      if (styles.letterSpacing != null) {
        element.style.letterSpacing = `${styles.letterSpacing}px`;
      }
      if (styles.fontWeight) {
        element.style.fontWeight = styles.fontWeight;
      }
      if (styles.fontFamily) {
        element.style.fontFamily = styles.fontFamily;
      }
      if (styles.textAlign) {
        element.style.textAlign = styles.textAlign;
      }
      if (styles.textTransform) {
        element.style.textTransform = styles.textTransform;
      }
      if (styles.color) {
        element.style.color = styles.color;
      }
    });

    Object.keys(textBaseRef.current).forEach((id) => {
      if (editedIds.has(id)) {
        return;
      }
      const element = container.querySelector(`[data-gem-id="${id}"]`);
      const snapshot = textBaseRef.current[id];
      if (!element || !snapshot) {
        delete textBaseRef.current[id];
        return;
      }
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.value = snapshot.text;
      } else {
        element.textContent = snapshot.text;
      }
      element.style.fontSize = `${snapshot.fontSize}px`;
      element.style.lineHeight = `${snapshot.lineHeight}`;
      element.style.letterSpacing = `${snapshot.letterSpacing}px`;
      element.style.fontWeight = snapshot.fontWeight;
      element.style.fontFamily = snapshot.fontFamily;
      element.style.textAlign = snapshot.textAlign;
      element.style.textTransform = snapshot.textTransform;
      element.style.color = snapshot.color;
      delete textBaseRef.current[id];
    });
  }, [isIterationMode, iterationSiteRef, textEdits]);

  useEffect(() => {
    if (!isIterationMode || iterationTool !== "text") {
      setTextEditDraft(null);
      return;
    }
    if (!iterationSiteRef.current || !selectedElementId) {
      setTextEditDraft(null);
      return;
    }
    const element = iterationSiteRef.current.querySelector(
      `[data-gem-id="${selectedElementId}"]`
    );
    const editable = getEditableTextElement(element);
    if (!editable) {
      setTextEditDraft(null);
      return;
    }
    const snapshot = getTextSnapshot(editable);
    if (!snapshot) {
      setTextEditDraft(null);
      return;
    }
    const overrides = textEdits[selectedElementId];
    setTextEditDraft({
      id: selectedElementId,
      ...snapshot,
      text: overrides?.text ?? snapshot.text,
      ...(overrides?.styles ?? {}),
    });
  }, [isIterationMode, iterationTool, selectedElementId, textEdits, iterationSiteRef]);

  const updateTextEdits = (id, update) => {
    setTextEdits((current) => {
      const existing = current[id] ?? { text: null, styles: {} };
      const next = {
        ...existing,
        ...update,
        styles: {
          ...existing.styles,
          ...(update.styles ?? {}),
        },
      };
      return { ...current, [id]: next };
    });
  };

  const handleTextContentChange = (value) => {
    if (!textEditDraft?.id) {
      return;
    }
    scheduleHistoryCommit("Text edit");
    setTextEditDraft((current) =>
      current ? { ...current, text: value } : current
    );
    updateTextEdits(textEditDraft.id, { text: value });
  };

  const handleTextStyleChange = (key, value) => {
    if (!textEditDraft?.id) {
      return;
    }
    if (typeof value === "number" && Number.isNaN(value)) {
      return;
    }
    scheduleHistoryCommit("Text edit");
    setTextEditDraft((current) =>
      current ? { ...current, [key]: value } : current
    );
    updateTextEdits(textEditDraft.id, { styles: { [key]: value } });
  };

  const applyTextStyles = (id, styles, commitLabel = "Text edit") => {
    if (!id || !styles) {
      return;
    }
    const nextStyles = Object.entries(styles).reduce((acc, [key, value]) => {
      if (typeof value === "number" && Number.isNaN(value)) {
        return acc;
      }
      return { ...acc, [key]: value };
    }, {});
    if (!Object.keys(nextStyles).length) {
      return;
    }
    if (commitLabel) {
      scheduleHistoryCommit(commitLabel);
    }
    updateTextEdits(id, { styles: nextStyles });
    setTextEditDraft((current) => {
      if (!current || current.id !== id) {
        return current;
      }
      return { ...current, ...nextStyles };
    });
  };

  const handleResetTextEdit = () => {
    if (!textEditDraft?.id) {
      return;
    }
    scheduleHistoryCommit("Text reset");
    setTextEdits((current) => {
      const next = { ...current };
      delete next[textEditDraft.id];
      return next;
    });
    setTextEditDraft(null);
  };

  const removeTextEditsForIds = (ids) => {
    if (!ids.length) {
      return;
    }
    setTextEdits((current) => {
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
    setTextEditDraft((current) => {
      if (current && ids.includes(current.id)) {
        return null;
      }
      return current;
    });
    ids.forEach((id) => {
      if (textBaseRef.current[id]) {
        delete textBaseRef.current[id];
      }
    });
  };

  return {
    state: { textEdits, textEditDraft },
    actions: {
      handleTextContentChange,
      handleTextStyleChange,
      handleResetTextEdit,
      applyTextStyles,
      removeTextEditsForIds,
      setTextEditDraft,
      setTextEdits,
    },
  };
}
