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
      <div key={node.id}>
        <button
          type="button"
          onClick={() => (isFolder ? toggleFolder(node.id) : onSelect(node))}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px 6px 12px",
            paddingLeft: `${12 + depth * 14}px`,
            background: isActive ? "#1f2937" : "transparent",
            color: "#e5e7eb",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ width: "16px", color: "#9ca3af" }}>
            {isFolder ? (isExpanded ? "v" : ">") : ""}
          </span>
          <span>{isFolder ? "[DIR]" : "[FILE]"}</span>
          <span style={{ flex: 1, minWidth: 0 }}>{node.name}</span>
        </button>

        {canEdit && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginTop: "-34px",
              marginBottom: "4px",
              justifyContent: "flex-end",
              paddingRight: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => onRename?.(node)}
              style={{
                background: "#1f2937",
                border: "1px solid #374151",
                color: "#d1d5db",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(node)}
              style={{
                background: "#3f1d1d",
                border: "1px solid #7f1d1d",
                color: "#fecaca",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
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

  return <div>{files.map((file) => renderNode(file))}</div>;
}
