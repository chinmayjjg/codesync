import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUnique, projectFindFirst, fileFindUnique } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  projectFindFirst: vi.fn(),
  fileFindUnique: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
    },
    project: {
      findFirst: projectFindFirst,
    },
    file: {
      findUnique: fileFindUnique,
    },
  },
}));

import { getFileAccess, getProjectAccess } from "./projectAccess";

const projectId = "507f1f77bcf86cd799439011";
const ownerId = "507f1f77bcf86cd799439012";
const editorId = "507f1f77bcf86cd799439013";
const viewerId = "507f1f77bcf86cd799439014";
const fileId = "507f1f77bcf86cd799439015";

describe("project access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants owner write and role-management access", async () => {
    userFindUnique.mockResolvedValue({ id: ownerId });
    projectFindFirst.mockResolvedValue({
      id: projectId,
      ownerId,
      members: [],
    });

    await expect(getProjectAccess(projectId, ownerId)).resolves.toEqual({
      projectId,
      role: "owner",
      canRead: true,
      canWrite: true,
      canManageRoles: true,
    });
  });

  it("grants editor read/write access without role management", async () => {
    userFindUnique.mockResolvedValue({ id: editorId });
    projectFindFirst.mockResolvedValue({
      id: projectId,
      ownerId,
      members: [{ role: "editor" }],
    });

    await expect(getProjectAccess(projectId, editorId)).resolves.toEqual({
      projectId,
      role: "editor",
      canRead: true,
      canWrite: true,
      canManageRoles: false,
    });
  });

  it("grants viewer read-only access", async () => {
    userFindUnique.mockResolvedValue({ id: viewerId });
    projectFindFirst.mockResolvedValue({
      id: projectId,
      ownerId,
      members: [{ role: "viewer" }],
    });

    await expect(getProjectAccess(projectId, viewerId)).resolves.toEqual({
      projectId,
      role: "viewer",
      canRead: true,
      canWrite: false,
      canManageRoles: false,
    });
  });

  it("returns null for unknown users", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(getProjectAccess(projectId, viewerId)).resolves.toBeNull();
    expect(projectFindFirst).not.toHaveBeenCalled();
  });

  it("resolves file access through project access", async () => {
    fileFindUnique.mockResolvedValue({
      id: fileId,
      projectId,
    });
    userFindUnique.mockResolvedValue({ id: editorId });
    projectFindFirst.mockResolvedValue({
      id: projectId,
      ownerId,
      members: [{ role: "editor" }],
    });

    await expect(getFileAccess(fileId, editorId)).resolves.toEqual({
      fileId,
      access: {
        projectId,
        role: "editor",
        canRead: true,
        canWrite: true,
        canManageRoles: false,
      },
    });
  });
});
