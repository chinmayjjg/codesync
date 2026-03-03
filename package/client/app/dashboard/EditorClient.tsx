"use client";

import React from "react";
import Editor from "@monaco-editor/react";

export default function EditorClient() {
  return (
    <div style={{ marginTop: "16px", minHeight: "420px" }}>
      <Editor
        height="60vh"
        defaultLanguage="javascript"
        defaultValue="// Start typing..."
        theme="vs-dark"
        options={{ automaticLayout: true }}
      />
    </div>
  );
}
