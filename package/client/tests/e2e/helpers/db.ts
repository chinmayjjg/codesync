import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function cleanupUsersByEmail(emails: string[]) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emails,
      },
    },
    select: {
      id: true,
    },
  });

  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    return;
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: { in: userIds } },
        {
          members: {
            some: {
              userId: {
                in: userIds,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  const projectIds = projects.map((project) => project.id);

  if (projectIds.length > 0) {
    await prisma.fileVersion.deleteMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
    });

    await prisma.file.deleteMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
    });

    await prisma.projectMember.deleteMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
    });

    await prisma.project.deleteMany({
      where: {
        id: {
          in: projectIds,
        },
      },
    });
  }

  await prisma.projectMember.deleteMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
}

export async function seedViewerProject() {
  const ownerEmail = "owner.e2e@codesync.test";
  const viewerEmail = "viewer.e2e@codesync.test";
  const password = "password123";

  await cleanupUsersByEmail([ownerEmail, viewerEmail]);

  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.create({
    data: {
      email: ownerEmail,
      name: "Owner E2E",
      password: passwordHash,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: viewerEmail,
      name: "Viewer E2E",
      password: passwordHash,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Viewer Access Project",
      ownerId: owner.id,
    },
  });

  await prisma.projectMember.create({
    data: {
      userId: viewer.id,
      projectId: project.id,
      role: "viewer",
    },
  });

  await prisma.file.create({
    data: {
      name: "viewer-file.ts",
      content: "export const mode = 'view-only';",
      projectId: project.id,
      parentId: null,
      type: "file",
    },
  });

  return {
    ownerEmail,
    viewerEmail,
    password,
    projectId: project.id,
  };
}
