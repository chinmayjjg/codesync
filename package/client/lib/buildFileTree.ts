import type { FileTreeNode, ProjectFile } from "@codesync/shared";

export type { FileTreeNode, ProjectFile, ProjectFileType } from "@codesync/shared";

function sortNodes(nodes: FileTreeNode[]) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  nodes.forEach((node) => sortNodes(node.children));
}

export function buildFileTree(files: ProjectFile[]) {
  const map: Record<string, FileTreeNode> = {};
  const roots: FileTreeNode[] = [];

  files.forEach((file) => {
    map[file.id] = {
      ...file,
      parentId: file.parentId ?? null,
      children: [],
    };
  });

  files.forEach((file) => {
    const node = map[file.id];

    if (!node) {
      return;
    }

    if (file.parentId && map[file.parentId]) {
      map[file.parentId].children.push(node);
      return;
    }

    roots.push(node);
  });

  sortNodes(roots);
  return roots;
}
