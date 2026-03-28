import { prisma } from "./prisma";
import type { Collaborator } from "@codesync/shared";

export type { Collaborator } from "@codesync/shared";

export async function getProjectCollaborators(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
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
    return null;
  }

  const owner = await prisma.user.findUnique({
    where: { id: project.ownerId },
    select: { id: true, email: true, name: true },
  });

  const memberCollaborators: Collaborator[] = project.members
    .filter(
      (member) =>
        member.userId !== project.ownerId &&
        Boolean(
          (member as typeof member & {
            user?: { id: string; email: string; name: string | null } | null;
          }).user
        )
    )
    .map((member) => ({
      id: member.user.id,
      memberId: member.id,
      email: member.user.email,
      name: member.user.name,
      role: member.role === "viewer" ? "viewer" : "editor",
    }));

  if (!owner) {
    return memberCollaborators;
  }

  return [
    {
      id: owner.id,
      memberId: null,
      email: owner.email,
      name: owner.name,
      role: "owner" as const,
    },
    ...memberCollaborators,
  ];
}
