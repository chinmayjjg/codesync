export type UserRole = "OWNER" | "EDITOR" | "VIEWER";

export type ProjectRole = "owner" | "editor" | "viewer";

export type ProjectFileType = "file" | "folder";

export type ProjectFile = {
  id: string;
  name: string;
  content: string;
  projectId: string;
  parentId: string | null;
  type: ProjectFileType;
};

export type FileTreeNode = ProjectFile & {
  children: FileTreeNode[];
};

export type Collaborator = {
  id: string;
  memberId: string | null;
  email: string;
  name: string | null;
  role: ProjectRole;
};

export type ActiveCollaborator = {
  clientId: number;
  name: string;
  color: string;
  email?: string;
  isTyping: boolean;
  isOnline: boolean;
};

export type CursorState = {
  position: {
    lineNumber: number;
    column: number;
  };
};

export type AwarenessState = {
  user?: {
    name?: string;
    color?: string;
    email?: string;
  };
  cursor?: CursorState;
  typing?: boolean;
};

export type RealtimeConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected";
