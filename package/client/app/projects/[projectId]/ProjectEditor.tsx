"use client";

import { useEffect, useRef, useState } from "react";
import CodeEditor from "./Editor";
import CreateFile from "./CreateFile";
import FileTabs from "@/app/components/FileTabs";
import FileTree from "@/app/components/FileTree";
import { buildFileTree } from "@/lib/buildFileTree";
import type {
  ActiveCollaborator,
  Collaborator,
  FileVersionEntry,
  ProjectFile,
  ProjectRole,
  RealtimeConnectionStatus,
} from "@codesync/shared";

type InviteResponse = {
  id: string;
  role: Exclude<ProjectRole, "owner">;
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
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionStatus>("connecting");
  const [saveState, setSaveState] = useState<string>("");
  const [treeMessage, setTreeMessage] = useState<string>("");
  const [historyEntries, setHistoryEntries] = useState<FileVersionEntry[]>([]);
  const [historyState, setHistoryState] = useState<string>("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null
  );
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

  const inviteOrUpdate = async (
    email: string,
    role: Exclude<ProjectRole, "owner">
  ) => {
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
    role: Exclude<ProjectRole, "owner">
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

  const refreshHistory = async (fileId: string) => {
    setHistoryLoading(true);
    setHistoryState("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/files/${fileId}/history`
      );
      const body = (await response.json().catch(() => [])) as
        | FileVersionEntry[]
        | { error?: string };

      if (!response.ok || !Array.isArray(body)) {
        throw new Error(
          Array.isArray(body)
            ? "Failed to load history"
            : body.error || "Failed to load history"
        );
      }

      setHistoryEntries(body);
    } catch (error) {
      console.error("Failed to load history:", error);
      setHistoryEntries([]);
      setHistoryState(
        error instanceof Error ? error.message : "Failed to load history"
      );
    } finally {
      setHistoryLoading(false);
    }
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
      void refreshHistory(fileId);
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

  const handleRestoreVersion = async (versionId: string) => {
    if (!activeFileId || !canEdit) {
      return;
    }

    setRestoringVersionId(versionId);
    setHistoryState("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/files/${activeFileId}/history`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        }
      );

      const body = (await response.json().catch(() => ({}))) as
        | ProjectFile
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in body ? body.error || "Restore failed" : "Restore failed"
        );
      }

      if ("id" in body) {
        updateFileContentState(body.id, body.content);
      }

      setSaveState("Restored");
      setHistoryState("Version restored");
      await refreshHistory(activeFileId);
    } catch (error) {
      console.error("Failed to restore version:", error);
      setHistoryState(
        error instanceof Error ? error.message : "Restore failed"
      );
    } finally {
      setRestoringVersionId(null);
    }
  };

  useEffect(() => {
    if (!activeFileId) {
      setHistoryEntries([]);
      setHistoryState("");
      return;
    }

    void refreshHistory(activeFileId);
  }, [activeFileId]);

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
    <div className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">CodeSync Workspace</p>
          <h1 className="workspace-title">Project Editor</h1>
        </div>
        <div className="workspace-header-meta">
          <span className={`status-pill status-pill-${connectionState}`}>
            {connectionState === "connected"
              ? "Realtime connected"
              : connectionState === "connecting"
                ? "Realtime reconnecting"
                : "Realtime offline"}
          </span>
          <span className="status-pill status-pill-neutral">
            {canEdit ? "Edit access" : "View only"}
          </span>
          <span className="status-pill status-pill-neutral">
            {activeFile ? saveState || "Ready" : "No file selected"}
          </span>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <section className="workspace-card">
            <div className="workspace-card-header">
              <div>
                <p className="workspace-card-kicker">Explorer</p>
                <h2 className="workspace-card-title">Project files</h2>
              </div>
            </div>

            <CreateFile
              projectId={projectId}
              folders={folders}
              onFileCreated={handleFileCreated}
              disabled={!canEdit}
              inputRef={createInputRef}
            />

            {!canEdit && (
              <p className="workspace-hint">
                You have view-only access to this project.
              </p>
            )}

            {treeMessage && <p className="workspace-hint">{treeMessage}</p>}

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <span>Files</span>
                <span>{files.length}</span>
              </div>
              {files.length === 0 ? (
                <div className="empty-panel">
                  <p className="empty-panel-title">No files yet</p>
                  <p className="empty-panel-copy">
                    Create a file or folder to turn this project into a working
                    workspace.
                  </p>
                </div>
              ) : (
                <FileTree
                  files={tree}
                  activeFileId={activeFileId}
                  onSelect={openFile}
                  onRename={handleRenameFile}
                  onDelete={handleDeleteFile}
                  canEdit={canEdit}
                />
              )}
            </div>
          </section>

          <section className="workspace-card">
            <div className="workspace-card-header">
              <div>
                <p className="workspace-card-kicker">Collaboration</p>
                <h2 className="workspace-card-title">People</h2>
              </div>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="secondary-action"
              >
                Copy link
              </button>
            </div>

            <div className="share-link-card">
              <input readOnly value={shareLink} className="share-link-input" />
            </div>

            {canManageRoles && (
              <form onSubmit={handleInviteSubmit} className="invite-form">
                <input
                  type="email"
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="invite-input"
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  className="invite-select"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-action"
                >
                  {isSubmitting ? "Sending..." : "Send invite"}
                </button>
              </form>
            )}

            {inviteState && <p className="workspace-hint">{inviteState}</p>}

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <span>Collaborators</span>
                <span>{collaborators.length}</span>
              </div>
              {collaborators.length === 0 ? (
                <div className="empty-panel">
                  <p className="empty-panel-title">No collaborators yet</p>
                  <p className="empty-panel-copy">
                    Share the project with teammates to collaborate in real
                    time.
                  </p>
                </div>
              ) : (
                <div className="collaborator-list">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="collaborator-row">
                      <div>
                        <div className="collaborator-name">
                          {collab.name || collab.email}
                        </div>
                        <small className="collaborator-email">
                          {collab.email}
                        </small>
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
                            className="collaborator-role-select"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                        ) : (
                          <span className="role-badge">
                            {collab.role === "viewer"
                              ? "Viewer"
                              : collab.role === "editor"
                                ? "Editor"
                                : "Owner"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <span>Active now</span>
                <span>{activeCollaborators.length}</span>
              </div>
              {activeCollaborators.length === 0 ? (
                <div className="empty-panel empty-panel-compact">
                  <p className="empty-panel-title">Nobody else is here</p>
                  <p className="empty-panel-copy">
                    Active collaborators will appear here when they join.
                  </p>
                </div>
              ) : (
                <div className="presence-list">
                  {activeCollaborators.map((user) => (
                    <div key={user.clientId} className="presence-row">
                      <div className="presence-main">
                        <span
                          className="presence-dot"
                          style={{
                            backgroundColor: user.color,
                            boxShadow: user.isOnline
                              ? `0 0 0 3px ${user.color}33`
                              : "none",
                          }}
                        />
                        <div>
                          <div className="collaborator-name">{user.name}</div>
                          {user.email && (
                            <small className="collaborator-email">
                              {user.email}
                            </small>
                          )}
                        </div>
                      </div>
                      <div className="presence-state">
                        {user.isTyping
                          ? "Typing..."
                          : user.isOnline
                            ? "Online"
                            : "Offline"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="workspace-editor-card">
          <div className="editor-topbar">
            <div>
              <p className="workspace-card-kicker">Editor</p>
              <h2 className="workspace-card-title">
                {activeFile ? activeFile.name : "No file open"}
              </h2>
            </div>
            {activeFile && (
              <div className="editor-meta">
                <span className="role-badge">
                  {activeFile.type === "folder" ? "Folder" : "File"}
                </span>
                <span className="role-badge">{openFiles.length} open tab(s)</span>
              </div>
            )}
          </div>

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

          <div className="editor-statusbar">
            <span>
              {activeFile
                ? `${activeFile.name} is ready`
                : "Pick a file from the explorer to begin"}
            </span>
            <span>{activeFile ? saveState || "Ready" : "Idle"}</span>
          </div>

          {activeFile && (
            <div className="history-panel">
              <div className="workspace-panel-header">
                <span>Version history</span>
                <button
                  type="button"
                  onClick={() => void refreshHistory(activeFile.id)}
                  className="history-refresh"
                >
                  {historyLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {historyState && <p className="workspace-hint history-hint">{historyState}</p>}
              {historyEntries.length === 0 ? (
                <div className="empty-panel empty-panel-compact">
                  <p className="empty-panel-title">No saved versions yet</p>
                  <p className="empty-panel-copy">
                    Save this file to capture a recoverable snapshot.
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {historyEntries.map((entry) => (
                    <div key={entry.id} className="history-row">
                      <div className="history-main">
                        <div className="history-title">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                        <small className="history-meta">
                          {entry.restoredFromVersionId
                            ? "Restored snapshot"
                            : "Saved snapshot"}
                        </small>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void handleRestoreVersion(entry.id)}
                          disabled={restoringVersionId === entry.id}
                          className="secondary-action history-action"
                        >
                          {restoringVersionId === entry.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="editor-content">
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
              <div className="editor-empty-state">
                <div className="editor-empty-illustration">{"</>"}</div>
                <p className="empty-panel-title">Choose a file to start editing</p>
                <p className="empty-panel-copy">
                  Open something from the explorer, or create a new file to
                  turn this blank canvas into code.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
