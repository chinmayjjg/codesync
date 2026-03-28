import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getServerSession,
  getCurrentUserRecord,
  checkRateLimit,
  getFileAccess,
  fileFindUnique,
  fileFindFirst,
  fileUpdate,
  fileFindMany,
  fileDelete,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getCurrentUserRecord: vi.fn(),
  checkRateLimit: vi.fn(),
  getFileAccess: vi.fn(),
  fileFindUnique: vi.fn(),
  fileFindFirst: vi.fn(),
  fileUpdate: vi.fn(),
  fileFindMany: vi.fn(),
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

vi.mock("../../../../../../lib/prisma", () => ({
  prisma: {
    file: {
      findUnique: fileFindUnique,
      findFirst: fileFindFirst,
      update: fileUpdate,
      findMany: fileFindMany,
      delete: fileDelete,
    },
  },
}));

import { DELETE, PUT } from "./route";

const projectId = "507f1f77bcf86cd799439011";
const fileId = "507f1f77bcf86cd799439012";
const childFolderId = "507f1f77bcf86cd799439013";
const childFileId = "507f1f77bcf86cd799439014";
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
    fileFindMany
      .mockResolvedValueOnce([
        { id: childFolderId, parentId: fileId },
        { id: childFileId, parentId: fileId },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/projects/x/files/y", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ projectId, FileId: fileId }),
    });

    expect(response.status).toBe(200);
    expect(fileDelete).toHaveBeenNthCalledWith(1, {
      where: { id: childFolderId },
    });
    expect(fileDelete).toHaveBeenNthCalledWith(2, {
      where: { id: childFileId },
    });
    expect(fileDelete).toHaveBeenNthCalledWith(3, {
      where: { id: fileId },
    });
  });
});
