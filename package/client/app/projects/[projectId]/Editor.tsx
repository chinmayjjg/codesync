"use client";

import { useRef } from "react";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditorApi } from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { getClientEnv } from "@/lib/env.client";
import type {
  ActiveCollaborator,
  AwarenessState,
  ProjectFile,
  RealtimeConnectionStatus,
} from "@codesync/shared";

export default function CodeEditor({
  file,
  onAwarenessChange,
  onConnectionStatusChange,
  onContentChange,
  readOnly = false,
  wsToken,
  currentUser,
}: {
  file: Pick<ProjectFile, "id" | "content">;
  onAwarenessChange?: (users: ActiveCollaborator[]) => void;
  onConnectionStatusChange?: (status: RealtimeConnectionStatus) => void;
  onContentChange?: (content: string) => void;
  readOnly?: boolean;
  wsToken?: string;
  currentUser: {
    id: string;
    name: string | null;
    email: string;
  };
}) {
  const lastContentRef = useRef(file.content);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleEditorDidMount(
    editor: MonacoEditorApi.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor")
  ) {
    const { MonacoBinding } = await import("y-monaco");
    const ydoc = new Y.Doc();
    let decorationIds: string[] = [];

    const wsUrl = getClientEnv().NEXT_PUBLIC_WS_URL;
    const provider = new WebsocketProvider(
      wsUrl,
      file.id,
      ydoc,
      wsToken
        ? {
            params: {
              token: wsToken,
            },
          }
        : undefined
    );
    onConnectionStatusChange?.("connecting");

    const yText = ydoc.getText("monaco");

    new MonacoBinding(
      yText,
      editor.getModel() as never,
      new Set([editor]),
      provider.awareness
    );

    // User awareness
    const username = currentUser.name?.trim() || currentUser.email;
    const awarenessColor = stringToColor(currentUser.id);

    provider.awareness.setLocalStateField("user", {
      name: username,
      email: currentUser.email,
      color: awarenessColor,
    });
    provider.awareness.setLocalStateField("typing", false);

    // Cursor tracking
    editor.onDidChangeCursorPosition(
      (event: MonacoEditorApi.ICursorPositionChangedEvent) => {
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      cursorTimeoutRef.current = setTimeout(() => {
        provider.awareness.setLocalStateField("cursor", {
          position: event.position,
        });
      }, 40);
      }
    );

    provider.on("status", (event: { status: RealtimeConnectionStatus }) => {
      onConnectionStatusChange?.(event.status);
    });

    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      if (content === lastContentRef.current) {
        return;
      }

      lastContentRef.current = content;
      provider.awareness.setLocalStateField("typing", true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        provider.awareness.setLocalStateField("typing", false);
      }, 1200);

      onContentChange?.(content);
    });

    // Listen to other users
    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const decorations: MonacoEditorApi.IModelDeltaDecoration[] = [];
      const collaboratorMap = new Map<string, ActiveCollaborator>();

      states.forEach(([clientId, state]) => {
        const awarenessState = state as AwarenessState;
        if (clientId === provider.awareness.clientID) return;
        if (!awarenessState.user) return;

        const dedupeKey =
          awarenessState.user.email ||
          `${awarenessState.user.name || "anonymous"}-${clientId}`;
        const existingCollaborator = collaboratorMap.get(dedupeKey);
        const nextCollaborator: ActiveCollaborator = {
          clientId,
          name: awarenessState.user.name || "Anonymous",
          color: awarenessState.user.color || "#666666",
          email: awarenessState.user.email,
          isTyping: Boolean(awarenessState.typing),
          isOnline: true,
        };

        collaboratorMap.set(dedupeKey, {
          ...nextCollaborator,
          isTyping:
            Boolean(existingCollaborator?.isTyping) ||
            Boolean(nextCollaborator.isTyping),
        });

        if (!awarenessState.cursor) return;

        const cursorClassName = ensureAwarenessColorClass(
          `remote-cursor-${clientId}`,
          awarenessState.user.color || "#666666",
          "cursor"
        );
        const labelClassName = ensureAwarenessColorClass(
          `cursor-label-${clientId}`,
          awarenessState.user.color || "#666666",
          "label"
        );

        decorations.push({
          range: new monaco.Range(
            awarenessState.cursor.position.lineNumber,
            awarenessState.cursor.position.column,
            awarenessState.cursor.position.lineNumber,
            awarenessState.cursor.position.column
          ),
          options: {
            className: `remote-cursor ${cursorClassName}`,
            afterContentClassName: `cursor-label ${labelClassName}`,
            after: {
              content: awarenessState.user.name || awarenessState.user.email || "Anonymous",
              inlineClassName: `cursor-label ${labelClassName}`,
            },
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      });

      onAwarenessChange?.(
        Array.from(collaboratorMap.values()).sort((left, right) =>
          left.name.localeCompare(right.name)
        )
      );
      decorationIds = editor.deltaDecorations(decorationIds, decorations);
    });

    editor.onDidDispose(() => {
      onAwarenessChange?.([]);
      onConnectionStatusChange?.("disconnected");
      provider.awareness.setLocalState(null);
      decorationIds = editor.deltaDecorations(decorationIds, []);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
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

function stringToColor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 55%)`;
}

function ensureAwarenessColorClass(
  className: string,
  color: string,
  variant: "cursor" | "label"
) {
  if (typeof document === "undefined") {
    return className;
  }

  const styleId = `awareness-style-${className}`;
  if (document.getElementById(styleId)) {
    return className;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent =
    variant === "cursor"
      ? `.${className}{border-left-color:${color};color:${color};}`
      : `.${className}{background:${color};border-color:${color};color:#fff;}`;
  document.head.appendChild(style);

  return className;
}
