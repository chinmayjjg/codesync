import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import ProjectEditor from "./ProjectEditor";

type ProjectFile = {
  id: string;
  name: string;
  content: string;
  projectId: string;
};

async function getFiles(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    include: {
      files: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return project.files as ProjectFile[];
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

  const files = await getFiles(projectId, session.user.id);

  return <ProjectEditor files={files} projectId={projectId} />;
}
