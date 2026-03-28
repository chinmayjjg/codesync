import { beforeEach, describe, expect, it, vi } from "vitest";

const { fileFindMany, fileDeleteMany } = vi.hoisted(() => ({
  fileFindMany: vi.fn(),
  fileDeleteMany: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    file: {
      findMany: fileFindMany,
      deleteMany: fileDeleteMany,
    },
  },
}));

import { deleteProjectFileTree } from "./fileOperations";

describe("deleteProjectFileTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects descendants in memory and deletes them in one bulk operation", async () => {
    fileFindMany.mockResolvedValue([
      { id: "root", parentId: null },
      { id: "child-a", parentId: "root" },
      { id: "child-b", parentId: "root" },
      { id: "grandchild", parentId: "child-a" },
      { id: "outside", parentId: null },
    ]);
    fileDeleteMany.mockResolvedValue({ count: 4 });

    const result = await deleteProjectFileTree(
      "507f1f77bcf86cd799439011",
      "root"
    );

    expect(fileFindMany).toHaveBeenCalledWith({
      where: { projectId: "507f1f77bcf86cd799439011" },
      select: { id: true, parentId: true },
    });
    expect(fileDeleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: expect.arrayContaining(["root", "child-a", "child-b", "grandchild"]),
        },
      },
    });
    expect(result).toEqual({ count: 4 });
  });
});
