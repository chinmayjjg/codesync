import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getServerSession,
  getCurrentUserRecord,
  checkRateLimit,
  getProjectAccess,
  fileFindFirst,
  fileCreate,
  fileFindMany,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getCurrentUserRecord: vi.fn(),
  checkRateLimit: vi.fn(),
  getProjectAccess: vi.fn(),
  fileFindFirst: vi.fn(),
  fileCreate: vi.fn(),
  fileFindMany: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("../../../../../lib/currentUser", () => ({
  getCurrentUserRecord,
}));

vi.mock("../../../../../lib/rateLimit", () => ({
  checkRateLimit,
}));

vi.mock("../../../../../lib/projectAccess", () => ({
  getProjectAccess,
}));

vi.mock("../../../../../lib/prisma", () => ({
  prisma: {
    file: {
      findFirst: fileFindFirst,
      create: fileCreate,
      findMany: fileFindMany,
    },
  },
}));

import { GET, POST } from "./route";

const projectId = "507f1f77bcf86cd799439011";
const folderId = "507f1f77bcf86cd799439012";
const editorId = "507f1f77bcf86cd799439013";
const viewerId = "507f1f77bcf86cd799439014";

describe("project files route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: editorId } });
    getCurrentUserRecord.mockResolvedValue({ id: editorId });
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 10 });
  });

  it("prevents viewers from creating files", async () => {
    getCurrentUserRecord.mockResolvedValue({ id: viewerId });
    getProjectAccess.mockResolvedValue({
      projectId,
      role: "viewer",
      canRead: true,
      canWrite: false,
      canManageRoles: false,
    });

    const request = new Request("http://localhost/api/projects/x/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "notes.ts", type: "file" }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(fileCreate).not.toHaveBeenCalled();
  });

  it("creates a file for an editor when sibling and parent checks pass", async () => {
    getProjectAccess.mockResolvedValue({
      projectId,
      role: "editor",
      canRead: true,
      canWrite: true,
      canManageRoles: false,
    });
    fileFindFirst
      .mockResolvedValueOnce({ id: folderId })
      .mockResolvedValueOnce(null);
    fileCreate.mockResolvedValue({
      id: "507f1f77bcf86cd799439015",
      name: "notes.ts",
      content: "",
      projectId,
      parentId: folderId,
      type: "file",
    });

    const request = new Request("http://localhost/api/projects/x/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "notes.ts",
        type: "file",
        parentId: folderId,
      }),
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(200);
    expect(fileCreate).toHaveBeenCalledWith({
      data: {
        name: "notes.ts",
        content: "",
        projectId,
        parentId: folderId,
        type: "file",
      },
    });
  });

  it("lets viewers read project files", async () => {
    getCurrentUserRecord.mockResolvedValue({ id: viewerId });
    getProjectAccess.mockResolvedValue({
      projectId,
      role: "viewer",
      canRead: true,
      canWrite: false,
      canManageRoles: false,
    });
    fileFindMany.mockResolvedValue([{ id: "file-1", name: "readme.md" }]);

    const request = new Request("http://localhost/api/projects/x/files", {
      method: "GET",
    });

    const response = await GET(request as never, {
      params: Promise.resolve({ projectId }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "file-1", name: "readme.md" }]);
  });
});
