"use client";

import { useMemo, useState } from "react";

import { CODE_FILE_GROUPS, INITIAL_CODE_CONTENTS } from "../_lib/code-data";
import buildFileTree from "../_lib/file-tree";
import { getLanguageFromFilename } from "../_lib/language";

export default function useCodeWorkspace() {
  const [customFiles, setCustomFiles] = useState([]);
  const [activeCodeFileId, setActiveCodeFileId] = useState(
    CODE_FILE_GROUPS[0].items[0].id
  );
  const [openCodeTabs, setOpenCodeTabs] = useState(() => [
    CODE_FILE_GROUPS[0].items[0],
    CODE_FILE_GROUPS[0].items[1],
  ]);
  const [codePanelMode, setCodePanelMode] = useState("agent");
  const [collapsedFolders, setCollapsedFolders] = useState(() => ({}));
  const [codeContents, setCodeContents] = useState(INITIAL_CODE_CONTENTS);

  const codeFileGroups = useMemo(() => {
    if (!customFiles.length) {
      return CODE_FILE_GROUPS;
    }
    return [
      ...CODE_FILE_GROUPS,
      {
        label: "Uploads",
        items: customFiles,
      },
    ];
  }, [customFiles]);

  const codeTreeGroups = useMemo(() => {
    return codeFileGroups.map((group) => ({
      label: group.label,
      tree: buildFileTree(group.items),
    }));
  }, [codeFileGroups]);

  const activeCodeFile = useMemo(() => {
    return codeFileGroups
      .flatMap((group) => group.items)
      .find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, codeFileGroups]);

  const fallbackCodeFile = useMemo(() => {
    return openCodeTabs.find((file) => file.id === activeCodeFileId);
  }, [activeCodeFileId, openCodeTabs]);

  const resolvedCodeFile = activeCodeFile ?? fallbackCodeFile;
  const activeCodeLanguage = resolvedCodeFile?.language ?? "typescript";
  const activeCodeContent = codeContents[activeCodeFileId] ?? "";

  const handleOpenCodeFile = (file) => {
    if (!file) {
      return;
    }
    setActiveCodeFileId(file.id);
    setOpenCodeTabs((current) => {
      if (current.some((tab) => tab.id === file.id)) {
        return current;
      }
      return [...current, file];
    });
  };

  const handleEditorChange = (value) => {
    setCodeContents((current) => ({
      ...current,
      [activeCodeFileId]: value ?? "",
    }));
  };

  const handleToggleFolder = (key) => {
    setCollapsedFolders((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const addCustomFiles = (files) => {
    files.forEach((file) => {
      const id = `uploads/${file.name}`;
      const language = getLanguageFromFilename(file.name);
      setCustomFiles((current) => {
        if (current.some((entry) => entry.id === id)) {
          return current;
        }
        return [...current, { id, label: file.name, language }];
      });
      setCodeContents((current) => {
        if (current[id]) {
          return current;
        }
        const note = file.type.startsWith("image/")
          ? `/* Uploaded image: ${file.name} */`
          : `/* Uploaded file: ${file.name} */`;
        return { ...current, [id]: note };
      });
    });
  };

  return {
    state: {
      customFiles,
      activeCodeFileId,
      openCodeTabs,
      codePanelMode,
      collapsedFolders,
      codeContents,
    },
    derived: {
      codeFileGroups,
      codeTreeGroups,
      activeCodeFile,
      activeCodeLanguage,
      activeCodeContent,
    },
    actions: {
      setCodePanelMode,
      handleOpenCodeFile,
      handleEditorChange,
      handleToggleFolder,
      addCustomFiles,
    },
  };
}
