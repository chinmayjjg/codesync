"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

type ProjectFile = {
  id: string;
  projectId: string;
  content: string;
};

export default function CodeEditor({
  file,
}: {
  file: ProjectFile;
}) {
  const [code, setCode] = useState(file.content);

  const saveFile = async () => {
    await fetch(`/api/projects/${file.projectId}/files/${file.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: code }),
    });

    alert("Saved");
  };

  return (
    <div style={{ marginTop: "20px", minHeight: "400px" }}>
      <Editor
        height="60vh"
        defaultLanguage="javascript"
        value={code}
        onChange={(value) => setCode(value || "")}
        theme="vs-dark"
        options={{ automaticLayout: true }}
      />

      <button onClick={saveFile} style={{ marginTop: "10px" }}>
        Save
      </button>
    </div>
  );
}
