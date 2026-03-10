"use client";

import { useState } from "react";
import type { FileTreeNode, ProjectFile } from "@/lib/buildFileTree";

export default function FileTree({
  files,
  activeFileId,
  onSelect,
}: {
  files: FileTreeNode[];
  activeFileId: string | null;
  onSelect: (file: ProjectFile) => void;
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
          <span>{node.name}</span>
        </button>

        {isFolder &&
          isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return <div>{files.map((file) => renderNode(file))}</div>;
}
