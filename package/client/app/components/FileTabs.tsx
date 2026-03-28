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
    <div className="editor-tabs">
      {openFiles.length === 0 && (
        <div className="editor-tabs-empty">No open files</div>
      )}
      {openFiles.map((file) => (
        <div
          key={file.id}
          className={`editor-tab ${activeFileId === file.id ? "editor-tab-active" : ""}`}
          onClick={() => onSelect(file.id)}
        >
          <span className="editor-tab-dot" />
          <span className="editor-tab-name">{file.name}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose(file.id);
            }}
            className="editor-tab-close"
            aria-label={`Close ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
      {openFiles.length > 0 && onCloseActive && (
        <button
          type="button"
          onClick={onCloseActive}
          className="editor-tabs-utility"
        >
          Close Active
        </button>
      )}
    </div>
  );
}
