"use client";

import { useState } from "react";
import type { ProjectFile, ProjectFileType } from "@/lib/buildFileTree";

export default function CreateFile({
  projectId,
  folders,
  onFileCreated,
}: {
  projectId: string;
  folders: ProjectFile[];
  onFileCreated?: (file: ProjectFile) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectFileType>("file");
  const [parentId, setParentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createFile = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          parentId: parentId || null,
        }),
      });

      if (response.ok) {
        const newFile = (await response.json()) as ProjectFile;
        setName("");
        setType("file");
        setParentId("");
        onFileCreated?.(newFile);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <input
        placeholder={type === "folder" ? "Folder name" : "File name"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
        style={{ padding: "8px" }}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ProjectFileType)}
        disabled={isLoading}
        style={{ padding: "8px" }}
      >
        <option value="file">File</option>
        <option value="folder">Folder</option>
      </select>
      <select
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        disabled={isLoading}
        style={{ padding: "8px" }}
      >
        <option value="">Root</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      <button onClick={createFile} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create"}
      </button>
    </div>
  );
}
