import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getServerSession,
  getCurrentUserRecord,
  checkRateLimit,
  getFileAccess,
  deleteProjectFileTree,
  fileFindUnique,
  fileFindFirst,
  fileUpdate,
  fileDelete,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getCurrentUserRecord: vi.fn(),
  checkRateLimit: vi.fn(),
  getFileAccess: vi.fn(),
  deleteProjectFileTree: vi.fn(),
  fileFindUnique: vi.fn(),
  fileFindFirst: vi.fn(),
  fileUpdate: vi.fn(),
  fileDelete: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("../../../../../../lib/currentUser", () => ({
  getCurrentUserRecord,
}));

vi.mock("../../../../../../lib/rateLimit", () => ({
  checkRateLimit,
}));

vi.mock("../../../../../../lib/projectAccess", () => ({
  getFileAccess,
}));

vi.mock("../../../../../../lib/fileOperations", () => ({
  deleteProjectFileTree,
}));

vi.mock("../../../../../../lib/prisma", () => ({
  prisma: {
    file: {
      findUnique: fileFindUnique,
      findFirst: fileFindFirst,
      update: fileUpdate,
      delete: fileDelete,
    },
  },
}));

import { DELETE, PUT } from "./route";

const projectId = "507f1f77bcf86cd799439011";
const fileId = "507f1f77bcf86cd799439012";
const editorId = "507f1f77bcf86cd799439015";

describe("project file detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: editorId } });
    getCurrentUserRecord.mockResolvedValue({ id: editorId });
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 10 });
  });

  it("prevents viewers from updating files", async () => {
    getFileAccess.mockResolvedValue({
      fileId,
      access: {
        projectId,
        role: "viewer",
        canRead: true,
        canWrite: false,
        canManageRoles: false,
      },
    });

    const request = new Request("http://localhost/api/projects/x/files/y", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hello" }),
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ projectId, FileId: fileId }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(fileUpdate).not.toHaveBeenCalled();
  });

  it("updates file content for an editor", async () => {
    getFileAccess.mockResolvedValue({
      fileId,
      access: {
        projectId,
        role: "editor",
        canRead: true,
        canWrite: true,
        canManageRoles: false,
      },
    });
    fileFindUnique.mockResolvedValueOnce({
      id: fileId,
      projectId,
      parentId: null,
      type: "file",
    });
    fileUpdate.mockResolvedValue({
      id: fileId,
      content: "updated",
    });

    const request = new Request("http://localhost/api/projects/x/files/y", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "updated" }),
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ projectId, FileId: fileId }),
    });

    expect(response.status).toBe(200);
    expect(fileUpdate).toHaveBeenCalledWith({
      where: { id: fileId },
      data: { content: "updated" },
    });
  });

  it("deletes folders recursively", async () => {
    getFileAccess.mockResolvedValue({
      fileId,
      access: {
        projectId,
        role: "editor",
        canRead: true,
        canWrite: true,
        canManageRoles: false,
      },
    });
    fileFindUnique.mockResolvedValue({
      id: fileId,
      projectId,
      type: "folder",
    });

    const request = new Request("http://localhost/api/projects/x/files/y", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ projectId, FileId: fileId }),
    });

    expect(response.status).toBe(200);
    expect(deleteProjectFileTree).toHaveBeenCalledWith(projectId, fileId);
    expect(fileDelete).not.toHaveBeenCalled();
  });
});
