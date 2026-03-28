import { prisma } from "./prisma";
import { isValidObjectId } from "./validation";

export type ProjectRole = "owner" | "editor" | "viewer";

export type ProjectAccess = {
  projectId: string;
  role: ProjectRole;
  canRead: boolean;
  canWrite: boolean;
  canManageRoles: boolean;
};

function toAccess(projectId: string, role: ProjectRole): ProjectAccess {
  return {
    projectId,
    role,
    canRead: true,
    canWrite: role === "owner" || role === "editor",
    canManageRoles: role === "owner",
  };
}

export async function getProjectAccess(
  projectId: string,
  userId: string
): Promise<ProjectAccess | null> {
  if (!isValidObjectId(projectId) || !isValidObjectId(userId)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!project) {
    return null;
  }

  if (project.ownerId === userId) {
    return toAccess(project.id, "owner");
  }

  const membership = project.members[0];
  if (!membership) {
    return null;
  }

  return toAccess(project.id, membership.role === "viewer" ? "viewer" : "editor");
}

export async function getFileAccess(fileId: string, userId: string) {
  if (!isValidObjectId(fileId) || !isValidObjectId(userId)) {
    return null;
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!file) {
    return null;
  }

  const access = await getProjectAccess(file.projectId, userId);
  if (!access) {
    return null;
  }

  return {
    fileId: file.id,
    access,
  };
}
