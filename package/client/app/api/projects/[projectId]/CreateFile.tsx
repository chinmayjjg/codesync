"use client";

import { useState } from "react";

export default function CreateFile({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");

  const createFile = async () => {
    await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    window.location.reload();
  };

  return (
    <div>
      <input
        placeholder="File name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={createFile}>Create File</button>
    </div>
  );
}