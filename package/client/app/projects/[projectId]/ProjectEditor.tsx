"use client";

import { useState } from "react";
import CodeEditor from "./Editor";
import CreateFile from "./CreateFile";
import FileTabs from "@/app/components/FileTabs";
import FileTree from "@/app/components/FileTree";
import { buildFileTree, type ProjectFile } from "@/lib/buildFileTree";

type Collaborator = {
  id: string;
  memberId: string | null;
  email: string;
  name: string | null;
  role: "owner" | "editor" | "viewer";
};

type ActiveCollaborator = {
  clientId: number;
  name: string;
  color: string;
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
}: {
  files: ProjectFile[];
  projectId: string;
  initialCollaborators: Collaborator[];
  canManageRoles: boolean;
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

  const mergeCollaborator = (member: InviteResponse) => {
    setCollaborators((prev) => {
      const index = prev.findIndex((c) => c.email === member.user.email);
      if (index === -1) {
        return [
          ...prev,
          {
            id: member.user.id,
            memberId: member.id,
            email: member.user.email,
            name: member.user.name,
            role: member.role,
          },
        ];
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        memberId: member.id,
        role: member.role,
        name: member.user.name,
      };
      return next;
    });
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

      if ("user" in data) mergeCollaborator(data);
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
        {activeCollaborators.length === 0 && <p>No one else is active.</p>}
        {activeCollaborators.map((user) => (
          <div
            key={user.clientId}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                backgroundColor: user.color,
              }}
            />
            <span>{user.name}</span>
          </div>
        ))}
      </div>

      <CreateFile
        projectId={projectId}
        folders={folders}
        onFileCreated={handleFileCreated}
      />

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
            />
            <div style={{ flex: 1, padding: activeFile ? 0 : "16px" }}>
              {activeFile ? (
                <CodeEditor
                  key={activeFile.id}
                  file={activeFile}
                  onAwarenessChange={setActiveCollaborators}
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
