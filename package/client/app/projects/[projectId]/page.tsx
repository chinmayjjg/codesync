import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { getProjectAccess } from "../../../lib/projectAccess";
import { getProjectCollaborators } from "../../../lib/projectCollaborators";
import { createWebSocketToken } from "../../../lib/jwt";
import ProjectEditor from "./ProjectEditor";
import type { ProjectFile } from "@codesync/shared";

async function getProjectData(projectId: string, userId: string) {
  const access = await getProjectAccess(projectId, userId);
  if (!access?.canRead) {
    notFound();
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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

  const collaborators = (await getProjectCollaborators(projectId)) ?? [];

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
    isOwner: access.canManageRoles,
    canEdit: access.canWrite,
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

  const { files, collaborators, isOwner, canEdit } = await getProjectData(
    projectId,
    session.user.id
  );

  // Generate WebSocket authentication token
  const wsToken = createWebSocketToken(session.user.id);

  return (
    <ProjectEditor
      files={files}
      projectId={projectId}
      initialCollaborators={collaborators}
      canManageRoles={isOwner}
      canEdit={canEdit}
      wsToken={wsToken}
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? "",
      }}
    />
  );
}
