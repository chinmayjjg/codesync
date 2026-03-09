"use client";

import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

export default function CodeEditor({ file }: { file: any }) {

  function handleEditorDidMount(editor: any, monaco: any) {
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

    // User awareness
    const username = "User-" + Math.floor(Math.random() * 1000);

    provider.awareness.setLocalStateField("user", {
      name: username,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    });

    // Cursor tracking
    editor.onDidChangeCursorPosition((event: any) => {
      provider.awareness.setLocalStateField("cursor", {
        position: event.position,
      });
    });

    // Listen to other users
    provider.awareness.on("change", () => {

  const states = Array.from(provider.awareness.getStates().entries())

  const decorations: any[] = []

  states.forEach(([clientId, state]: any) => {

    if (clientId === provider.awareness.clientID) return

    if (!state.cursor || !state.user) return

    decorations.push({
      range: new monaco.Range(
        state.cursor.position.lineNumber,
        state.cursor.position.column,
        state.cursor.position.lineNumber,
        state.cursor.position.column
      ),
      options: {
        className: "remote-cursor",
        after: {
          content: state.user.name,
          inlineClassName: "cursor-label"
        }
      }
    })

  })

  editor.deltaDecorations([], decorations)

})
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