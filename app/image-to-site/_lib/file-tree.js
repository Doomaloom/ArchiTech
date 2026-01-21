const buildFileTree = (files) => {
  const root = { name: "", path: "", children: new Map(), file: null };

  files.forEach((file) => {
    const parts = file.id.split("/").filter(Boolean);
    let cursor = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      if (!cursor.children.has(part)) {
        cursor.children.set(part, {
          name: part,
          path: cursor.path ? `${cursor.path}/${part}` : part,
          children: new Map(),
          file: isLeaf ? file : null,
        });
      }
      cursor = cursor.children.get(part);
      if (isLeaf) {
        cursor.file = file;
      }
    });
  });

  const toArray = (node) => {
    return Array.from(node.children.values()).map((child) => ({
      ...child,
      children: toArray(child),
    }));
  };

  return toArray(root);
};

export default buildFileTree;
