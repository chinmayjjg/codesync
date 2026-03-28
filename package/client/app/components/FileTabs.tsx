"use client";

import type { ProjectFile } from "@/lib/buildFileTree";

export default function FileTabs({
  openFiles,
  activeFileId,
  onSelect,
  onClose,
  onCloseActive,
}: {
  openFiles: ProjectFile[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onCloseActive?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #333",
        overflowX: "auto",
      }}
    >
      {openFiles.length === 0 && (
        <div style={{ padding: "8px 12px", color: "#6b7280" }}>No open files</div>
      )}
      {openFiles.map((file) => (
        <div
          key={file.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            background: activeFileId === file.id ? "#222" : "transparent",
            borderRight: "1px solid #333",
            color: "#e5e7eb",
          }}
          onClick={() => onSelect(file.id)}
        >
          <span>{file.name}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose(file.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label={`Close ${file.name}`}
          >
            x
          </button>
        </div>
      ))}
      {openFiles.length > 0 && onCloseActive && (
        <button
          type="button"
          onClick={onCloseActive}
          style={{
            marginLeft: "auto",
            padding: "8px 12px",
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
          }}
        >
          Close Active
        </button>
      )}
    </div>
  );
}
