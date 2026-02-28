"use client";

import { useState } from "react";

export default function CreateProject() {
  const [name, setName] = useState("");

  const createProject = async () => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    window.location.reload();
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <input
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={createProject}>Create</button>
    </div>
  );
}