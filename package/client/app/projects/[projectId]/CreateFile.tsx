"use client";

import { useState } from "react";

type ProjectFile = {
  id: string;
  name: string;
  content: string;
  projectId: string;
};

export default function CreateFile({
  projectId,
  onFileCreated,
}: {
  projectId: string;
  onFileCreated?: (file: ProjectFile) => void;
}) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createFile = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const newFile = await response.json();
        setName("");
        onFileCreated?.(newFile);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input
        placeholder="File name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />
      <button onClick={createFile} disabled={isLoading}>
        {isLoading ? "Creating..." : "Create File"}
      </button>
    </div>
  );
}
