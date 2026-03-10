import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import ProjectEditor from "./ProjectEditor";
import type { ProjectFile } from "@/lib/buildFileTree";

type Collaborator = {
  id: string;
  memberId: string | null;
  email: string;
  name: string | null;
  role: "owner" | "editor" | "viewer";
};

async function getProjectData(projectId: string, userId: string) {
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
    include: {
      files: {
        orderBy: { updatedAt: "desc" },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const owner = await prisma.user.findUnique({
    where: { id: project.ownerId },
    select: { id: true, email: true, name: true },
  });

  const memberCollaborators: Collaborator[] = project.members
    .filter((member) => member.userId !== project.ownerId)
    .map((member) => ({
      id: member.user.id,
      memberId: member.id,
      email: member.user.email,
      name: member.user.name,
      role: member.role as "editor" | "viewer",
    }));

  const collaborators: Collaborator[] = owner
    ? [
        {
          id: owner.id,
          memberId: null,
          email: owner.email,
          name: owner.name,
          role: "owner",
        },
        ...memberCollaborators,
      ]
    : memberCollaborators;

  const normalizedFiles: ProjectFile[] = project.files.map((file) => {
    const normalizedFile = file as typeof file & {
      parentId?: string | null;
      type?: "file" | "folder";
    };

    return {
      id: normalizedFile.id,
      name: normalizedFile.name,
      content: normalizedFile.content,
      projectId: normalizedFile.projectId,
      parentId: normalizedFile.parentId ?? null,
      type: normalizedFile.type ?? "file",
    };
  });

  return {
    files: normalizedFiles,
    collaborators,
    isOwner: project.ownerId === userId,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!session.user?.id) redirect("/login");

  const { files, collaborators, isOwner } = await getProjectData(
    projectId,
    session.user.id
  );

  return (
    <ProjectEditor
      files={files}
      projectId={projectId}
      initialCollaborators={collaborators}
      canManageRoles={isOwner}
    />
  );
}
