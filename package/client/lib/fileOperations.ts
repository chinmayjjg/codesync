import { prisma } from "./prisma";

type FileNode = {
  id: string;
  parentId: string | null;
};

export async function deleteProjectFileTree(projectId: string, rootId: string) {
  const nodes = (await prisma.file.findMany({
    where: { projectId },
    select: {
      id: true,
      parentId: true,
    },
  })) as FileNode[];

  const childrenByParent = new Map<string, string[]>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parentId, children);
  }

  const idsToDelete = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || idsToDelete.has(currentId)) {
      continue;
    }

    idsToDelete.add(currentId);
    const children = childrenByParent.get(currentId) ?? [];
    children.forEach((childId) => stack.push(childId));
  }

  const deleteIds = Array.from(idsToDelete);

  if (deleteIds.length === 0) {
    return { count: 0 };
  }

  return prisma.file.deleteMany({
    where: {
      id: {
        in: deleteIds,
      },
    },
  });
}
