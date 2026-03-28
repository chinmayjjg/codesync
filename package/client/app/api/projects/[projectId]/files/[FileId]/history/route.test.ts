import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getServerSession,
  getCurrentUserRecord,
  checkRateLimit,
  getFileAccess,
  listFileVersions,
  recordFileVersion,
  fileUpdate,
  fileVersionFindUnique,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getCurrentUserRecord: vi.fn(),
  checkRateLimit: vi.fn(),
  getFileAccess: vi.fn(),
  listFileVersions: vi.fn(),
  recordFileVersion: vi.fn(),
  fileUpdate: vi.fn(),
  fileVersionFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("../../../../../../../lib/currentUser", () => ({
  getCurrentUserRecord,
}));

vi.mock("../../../../../../../lib/rateLimit", () => ({
  checkRateLimit,
}));

vi.mock("../../../../../../../lib/projectAccess", () => ({
  getFileAccess,
}));

vi.mock("../../../../../../../lib/fileVersions", () => ({
  listFileVersions,
  recordFileVersion,
}));

vi.mock("../../../../../../../lib/prisma", () => ({
  prisma: {
    file: {
      update: fileUpdate,
    },
    fileVersion: {
      findUnique: fileVersionFindUnique,
    },
  },
}));

import { GET, POST } from "./route";

const projectId = "507f1f77bcf86cd799439011";
const fileId = "507f1f77bcf86cd799439012";
const versionId = "507f1f77bcf86cd799439013";
const editorId = "507f1f77bcf86cd799439014";

describe("file history route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { id: editorId } });
    getCurrentUserRecord.mockResolvedValue({ id: editorId });
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 10 });
  });

  it("returns file history for readers", async () => {
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
    listFileVersions.mockResolvedValue([{ id: versionId }]);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ projectId, FileId: fileId }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: versionId }]);
  });

  it("restores a version for editors and records a restore snapshot", async () => {
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
    fileVersionFindUnique.mockResolvedValue({
      id: versionId,
      fileId,
      projectId,
      content: "restored body",
    });
    fileUpdate.mockResolvedValue({
      id: fileId,
      content: "restored body",
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      }) as never,
      {
        params: Promise.resolve({ projectId, FileId: fileId }),
      }
    );

    expect(response.status).toBe(200);
    expect(fileUpdate).toHaveBeenCalledWith({
      where: { id: fileId },
      data: { content: "restored body" },
    });
    expect(recordFileVersion).toHaveBeenCalledWith({
      fileId,
      projectId,
      content: "restored body",
      createdById: editorId,
      restoredFromVersionId: versionId,
    });
  });
});
