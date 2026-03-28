"use client";

import { useState } from "react";
import type { FileTreeNode, ProjectFile } from "@/lib/buildFileTree";

export default function FileTree({
  files,
  activeFileId,
  onSelect,
  onRename,
  onDelete,
  canEdit,
}: {
  files: FileTreeNode[];
  activeFileId: string | null;
  onSelect: (file: ProjectFile) => void;
  onRename?: (file: ProjectFile) => void;
  onDelete?: (file: ProjectFile) => void;
  canEdit?: boolean;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    {}
  );

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !(prev[folderId] ?? true),
    }));
  }

  function renderNode(node: FileTreeNode, depth = 0) {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders[node.id] ?? true;
    const isActive = activeFileId === node.id;

    return (
      <div key={node.id} className="tree-node">
        <button
          type="button"
          onClick={() => (isFolder ? toggleFolder(node.id) : onSelect(node))}
          className={`tree-row ${isActive ? "tree-row-active" : ""}`}
          style={{ paddingLeft: `${14 + depth * 16}px` }}
        >
          <span className="tree-chevron">
            {isFolder ? (isExpanded ? "⌄" : "›") : "•"}
          </span>
          <span className="tree-kind">{isFolder ? "DIR" : "FILE"}</span>
          <span className="tree-name">{node.name}</span>
        </button>

        {canEdit && (
          <div className="tree-actions">
            <button
              type="button"
              onClick={() => onRename?.(node)}
              className="tree-action-button"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(node)}
              className="tree-action-button tree-action-danger"
            >
              Delete
            </button>
          </div>
        )}

        {isFolder &&
          isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return <div className="tree-root">{files.map((file) => renderNode(file))}</div>;
}
