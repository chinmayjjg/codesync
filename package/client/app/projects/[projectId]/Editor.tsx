"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export default function CodeEditor({ file }: { file: any }) {
  const editorRef = useRef<any>(null);

  async function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;

    // Dynamically import MonacoBinding only on client side
    const { MonacoBinding } = await import("y-monaco");

    const ydoc = new Y.Doc();

    const provider = new WebsocketProvider(
      "ws://localhost:1234",
      file.id,
      ydoc
    );

    const yText = ydoc.getText("monaco");

    new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
  }

  return (
    <Editor
      height="500px"
      defaultLanguage="javascript"
      defaultValue={file.content}
      theme="vs-dark"
      onMount={handleEditorDidMount}
    />
  );
}