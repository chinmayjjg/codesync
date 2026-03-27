"use client";

import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

type File = {
  id: string;
  content: string;
};

type ActiveCollaborator = {
  clientId: number;
  name: string;
  color: string;
};

type CursorState = {
  position: {
    lineNumber: number;
    column: number;
  };
};

type AwarenessState = {
  user?: {
    name?: string;
    color?: string;
  };
  cursor?: CursorState;
};

type MonacoEditorLike = {
  getModel: () => unknown;
  onDidChangeCursorPosition: (
    cb: (event: { position: CursorState["position"] }) => void
  ) => void;
  deltaDecorations: (oldDecorations: string[], decorations: unknown[]) => void;
  onDidDispose: (cb: () => void) => void;
};

type MonacoLike = {
  Range: new (
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number
  ) => unknown;
  editor: {
    TrackedRangeStickiness: {
      NeverGrowsWhenTypingAtEdges: number;
    };
  };
};

export default function CodeEditor({
  file,
  onAwarenessChange,
  readOnly = false,
}: {
  file: File;
  onAwarenessChange?: (users: ActiveCollaborator[]) => void;
  readOnly?: boolean;
}) {
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
      editor.getModel() as never,
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
      const states = Array.from(provider.awareness.getStates().entries());
      const decorations: unknown[] = [];
      const activeUsers: ActiveCollaborator[] = [];

      states.forEach(([clientId, state]) => {
        const awarenessState = state as AwarenessState;
        if (clientId === provider.awareness.clientID) return;
        if (!awarenessState.user) return;

        activeUsers.push({
          clientId,
          name: awarenessState.user.name || "Anonymous",
          color: awarenessState.user.color || "#666666",
        });

        if (!awarenessState.cursor) return;

        decorations.push({
          range: new monaco.Range(
            awarenessState.cursor.position.lineNumber,
            awarenessState.cursor.position.column,
            awarenessState.cursor.position.lineNumber,
            awarenessState.cursor.position.column
          ),
          options: {
            className: "remote-cursor",
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      });

      onAwarenessChange?.(activeUsers);
      editor.deltaDecorations([], decorations);
    });

    editor.onDidDispose(() => {
      onAwarenessChange?.([]);
      provider.destroy();
      ydoc.destroy();
    });
  }

  return (
    <Editor
      height="500px"
      defaultLanguage="javascript"
      defaultValue={file.content}
      theme="vs-dark"
      onMount={handleEditorDidMount}
      options={{ readOnly }}
    />
  );
}
