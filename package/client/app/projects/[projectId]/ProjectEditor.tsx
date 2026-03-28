"use client";

import { useEffect, useRef, useState } from "react";
import CodeEditor from "./Editor";
import CreateFile from "./CreateFile";
import FileTabs from "@/app/components/FileTabs";
import FileTree from "@/app/components/FileTree";
import { buildFileTree, type ProjectFile } from "@/lib/buildFileTree";
import type { Collaborator } from "@/lib/projectCollaborators";

type ActiveCollaborator = {
  clientId: number;
  name: string;
  color: string;
  email?: string;
  isTyping: boolean;
  isOnline: boolean;
};

type InviteResponse = {
  id: string;
  role: "editor" | "viewer";
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export default function ProjectEditor({
  files: initialFiles,
  projectId,
  initialCollaborators,
  canManageRoles,
  canEdit,
  wsToken,
  currentUser,
}: {
  files: ProjectFile[];
  projectId: string;
  initialCollaborators: Collaborator[];
  canManageRoles: boolean;
  canEdit: boolean;
  wsToken?: string;
  currentUser: {
    id: string;
    name: string | null;
    email: string;
  };
}) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteState, setInviteState] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] =
    useState<Collaborator[]>(initialCollaborators);
  const [activeCollaborators, setActiveCollaborators] = useState<
    ActiveCollaborator[]
  >([]);
  const [connectionState, setConnectionState] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");
  const [saveState, setSaveState] = useState<string>("");
  const [treeMessage, setTreeMessage] = useState<string>("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const activeFileStorageKey = `codesync:${projectId}:activeFile`;

  const tree = buildFileTree(files);
  const folders = files.filter((file) => file.type === "folder");
  const activeFile =
    openFiles.find((file) => file.id === activeFileId) ?? null;
  const shareLink =
    typeof window === "undefined"
      ? `/projects/${projectId}`
      : `${window.location.origin}/projects/${projectId}`;

  const openFile = (file: ProjectFile) => {
    if (file.type !== "file") {
      return;
    }

    setOpenFiles((prev) => {
      if (prev.some((openFile) => openFile.id === file.id)) {
        return prev;
      }

      return [...prev, file];
    });
    setActiveFileId(file.id);
    setTreeMessage("");
  };

  const closeFile = (fileId: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((file) => file.id !== fileId);

      if (activeFileId === fileId) {
        setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
      }

      return next;
    });
  };

  const handleFileCreated = (newFile: ProjectFile) => {
    setFiles((prev) => [newFile, ...prev]);

    if (newFile.type === "file") {
      openFile(newFile);
    }
  };

  const collectDescendantIds = (fileId: string) => {
    const descendantIds = new Set<string>([fileId]);
    let changed = true;

    while (changed) {
      changed = false;
      files.forEach((file) => {
        if (file.parentId && descendantIds.has(file.parentId) && !descendantIds.has(file.id)) {
          descendantIds.add(file.id);
          changed = true;
        }
      });
    }

    return descendantIds;
  };

  const refreshCollaborators = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      const body = (await response.json().catch(() => [])) as
        | Collaborator[]
        | { error?: string };

      if (!response.ok || !Array.isArray(body)) {
        throw new Error(Array.isArray(body) ? "Failed to load collaborators" : body.error || "Failed to load collaborators");
      }

      setCollaborators(body);
    } catch (error) {
      console.error("Failed to refresh collaborators:", error);
      setInviteState(error instanceof Error ? error.message : "Failed to load collaborators");
    }
  };

  const inviteOrUpdate = async (email: string, role: "editor" | "viewer") => {
    setIsSubmitting(true);
    setInviteState("");
    try {
      const res = await fetch(`/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = (await res.json()) as InviteResponse | { error?: string };

      if (!res.ok) {
        setInviteState(
          "error" in data ? data.error || "Failed to update collaborator" : ""
        );
        return false;
      }

      if ("user" in data) {
        await refreshCollaborators();
      }
      setInviteState("Access updated");
      return true;
    } catch {
      setInviteState("Request failed");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteState("Email is required");
      return;
    }

    const ok = await inviteOrUpdate(email, inviteRole);
    if (ok) setInviteEmail("");
  };

  const handleRoleChange = async (
    email: string,
    role: "editor" | "viewer"
  ) => {
    await inviteOrUpdate(email, role);
  };

  const handleCopyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setInviteState("Project link copied");
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSaveState(activeFileId ? "Ready" : "");
  }, [activeFileId]);

  useEffect(() => {
    const savedActiveFileId = window.localStorage.getItem(activeFileStorageKey);
    if (!savedActiveFileId) {
      return;
    }

    const savedFile = files.find((file) => file.id === savedActiveFileId);
    if (savedFile && savedFile.type === "file") {
      setOpenFiles((prev) =>
        prev.some((file) => file.id === savedFile.id) ? prev : [...prev, savedFile]
      );
      setActiveFileId(savedFile.id);
    }
  }, [activeFileStorageKey, files]);

  useEffect(() => {
    if (!activeFileId) {
      window.localStorage.removeItem(activeFileStorageKey);
      return;
    }

    window.localStorage.setItem(activeFileStorageKey, activeFileId);
  }, [activeFileId, activeFileStorageKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed) {
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activeFile) {
          void saveFileContent(activeFile.id, activeFile.content);
        }
        return;
      }

      if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (activeFileId) {
          closeFile(activeFileId);
        }
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, activeFileId]);

  const updateFileContentState = (fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, content } : file))
    );
    setOpenFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, content } : file))
    );
  };

  const saveFileContent = async (fileId: string, content: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Failed to save file");
      }

      setSaveState("Saved");
    } catch (error) {
      console.error("Failed to save file:", error);
      setSaveState("Save failed");
    }
  };

  const handleFileContentChange = (fileId: string, content: string) => {
    updateFileContentState(fileId, content);

    if (!canEdit) {
      return;
    }

    setSaveState("Saving...");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveFileContent(fileId, content);
    }, 600);
  };

  const handleRenameFile = async (file: ProjectFile) => {
    if (!canEdit) {
      return;
    }

    const nextName = window.prompt(`Rename ${file.type}`, file.name)?.trim();
    if (!nextName || nextName === file.name) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });

      const body = (await response.json().catch(() => ({}))) as
        | ProjectFile
        | { error?: string };

      if (!response.ok) {
        throw new Error("error" in body ? body.error || "Rename failed" : "Rename failed");
      }

      if ("id" in body) {
        setFiles((prev) => prev.map((entry) => (entry.id === body.id ? { ...entry, name: body.name } : entry)));
        setOpenFiles((prev) =>
          prev.map((entry) => (entry.id === body.id ? { ...entry, name: body.name } : entry))
        );
        setTreeMessage(`Renamed to ${body.name}`);
      }
    } catch (error) {
      console.error("Failed to rename file:", error);
      setTreeMessage(error instanceof Error ? error.message : "Rename failed");
    }
  };

  const handleDeleteFile = async (file: ProjectFile) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${file.type} "${file.name}"${file.type === "folder" ? " and its contents" : ""}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "DELETE",
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Delete failed");
      }

      const idsToRemove = collectDescendantIds(file.id);
      setFiles((prev) => prev.filter((entry) => !idsToRemove.has(entry.id)));
      setOpenFiles((prev) => prev.filter((entry) => !idsToRemove.has(entry.id)));
      if (activeFileId && idsToRemove.has(activeFileId)) {
        setActiveFileId(null);
      }
      setTreeMessage(`Deleted ${file.name}`);
    } catch (error) {
      console.error("Failed to delete file:", error);
      setTreeMessage(error instanceof Error ? error.message : "Delete failed");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Project Files</h1>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Share</h2>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "12px",
            alignItems: "center",
          }}
        >
          <input
            readOnly
            value={shareLink}
            style={{ flex: 1, minWidth: "260px", padding: "8px" }}
          />
          <button
            type="button"
            onClick={handleCopyShareLink}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            Share project link
          </button>
        </div>

        {canManageRoles && (
          <form
            onSubmit={handleInviteSubmit}
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              type="email"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ minWidth: "240px", padding: "8px" }}
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "editor" | "viewer")
              }
              style={{ padding: "8px" }}
            >
              <option value="viewer">View</option>
              <option value="editor">Edit</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 12px", cursor: "pointer" }}
            >
              Send invite
            </button>
          </form>
        )}

        {inviteState && (
          <p style={{ marginTop: "10px", marginBottom: 0 }}>{inviteState}</p>
        )}

        <div style={{ marginTop: "14px" }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Collaborators</h3>
          {collaborators.length === 0 && <p>No collaborators yet.</p>}
          {collaborators.map((collab) => (
            <div
              key={collab.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                padding: "6px 0",
                borderBottom: "1px solid #efefef",
              }}
            >
              <div>
                <div>{collab.name || collab.email}</div>
                <small>{collab.email}</small>
              </div>
              <div>
                {canManageRoles && collab.role !== "owner" ? (
                  <select
                    value={collab.role}
                    onChange={(e) =>
                      handleRoleChange(
                        collab.email,
                        e.target.value as "editor" | "viewer"
                      )
                    }
                    style={{ padding: "6px" }}
                  >
                    <option value="viewer">View</option>
                    <option value="editor">Edit</option>
                  </select>
                ) : (
                  <span style={{ textTransform: "capitalize" }}>
                    {collab.role === "viewer"
                      ? "View"
                      : collab.role === "editor"
                        ? "Edit"
                        : "Owner"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Active collaborators</h3>
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Realtime status:{" "}
          {connectionState === "connected"
            ? "Connected"
            : connectionState === "connecting"
              ? "Reconnecting..."
              : "Offline"}
        </p>
        {activeCollaborators.length === 0 && <p>No one else is active.</p>}
        {activeCollaborators.map((user) => (
          <div
            key={user.clientId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "6px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  backgroundColor: user.color,
                  boxShadow: user.isOnline
                    ? `0 0 0 3px ${user.color}33`
                    : "none",
                }}
              />
              <div>
                <div>{user.name}</div>
                {user.email && (
                  <small style={{ color: "#6b7280" }}>{user.email}</small>
                )}
              </div>
            </div>
            <div style={{ color: "#9ca3af", fontSize: "12px" }}>
              {user.isTyping ? "Typing..." : user.isOnline ? "Online" : "Offline"}
            </div>
          </div>
        ))}
      </div>

      <CreateFile
        projectId={projectId}
        folders={folders}
        onFileCreated={handleFileCreated}
        disabled={!canEdit}
        inputRef={createInputRef}
      />

      {!canEdit && (
        <p style={{ marginTop: "12px", color: "#6b7280" }}>
          You have view-only access to this project.
        </p>
      )}

      {treeMessage && (
        <p style={{ marginTop: "12px", color: "#6b7280" }}>{treeMessage}</p>
      )}

      {files.length === 0 && <p>No files yet. Create one to start editing.</p>}

      {files.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            border: "1px solid #2f2f2f",
            borderRadius: "8px",
            overflow: "hidden",
            minHeight: "560px",
          }}
        >
          <div
            style={{
              background: "#111827",
              borderRight: "1px solid #2f2f2f",
              padding: "12px 0",
            }}
          >
            <div style={{ padding: "0 12px 10px", color: "#9ca3af" }}>
              Explorer
            </div>
            <FileTree
              files={tree}
              activeFileId={activeFileId}
              onSelect={openFile}
              onRename={handleRenameFile}
              onDelete={handleDeleteFile}
              canEdit={canEdit}
            />
          </div>

          <div
            style={{
              background: "#0b1220",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <FileTabs
              openFiles={openFiles}
              activeFileId={activeFileId}
              onSelect={setActiveFileId}
              onClose={closeFile}
              onCloseActive={() => {
                if (activeFileId) {
                  closeFile(activeFileId);
                }
              }}
            />
            <div
              style={{
                minHeight: "32px",
                padding: "8px 12px",
                borderBottom: "1px solid #1f2937",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              {activeFile ? saveState || "Ready" : "No file selected"}
            </div>
            <div style={{ flex: 1, padding: activeFile ? 0 : "16px" }}>
              {activeFile ? (
                <CodeEditor
                  key={activeFile.id}
                  file={activeFile}
                  onAwarenessChange={setActiveCollaborators}
                  onConnectionStatusChange={setConnectionState}
                  onContentChange={(content) =>
                    handleFileContentChange(activeFile.id, content)
                  }
                  readOnly={!canEdit}
                  wsToken={wsToken}
                  currentUser={currentUser}
                />
              ) : (
                <p style={{ margin: 0, color: "#9ca3af" }}>
                  Select a file from the explorer to open it.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
