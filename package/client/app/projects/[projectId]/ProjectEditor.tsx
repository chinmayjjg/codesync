"use client";

import { useState } from "react";
import CodeEditor from "./Editor";
import CreateFile from "./CreateFile";

type ProjectFile = {
  id: string;
  name: string;
  content: string;
  projectId: string;
};

export default function ProjectEditor({
  files: initialFiles,
  projectId,
}: {
  files: ProjectFile[];
  projectId: string;
}) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    initialFiles[0]?.id || null
  );

  const selectedFile = files.find((f) => f.id === selectedFileId);

  const handleFileCreated = (newFile: ProjectFile) => {
    setFiles([newFile, ...files]);
    setSelectedFileId(newFile.id);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Project Files</h1>
      <CreateFile projectId={projectId} onFileCreated={handleFileCreated} />

      {files.length === 0 && (
        <p>No files yet. Create one to open Monaco editor.</p>
      )}

      {files.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            borderBottom: "1px solid #ccc",
            paddingBottom: "10px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Files:</h3>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                style={{
                  padding: "8px 12px",
                  backgroundColor:
                    selectedFileId === file.id ? "#007acc" : "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: selectedFileId === file.id ? "bold" : "normal",
                }}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedFile && <CodeEditor file={selectedFile} />}
    </div>
  );
}
