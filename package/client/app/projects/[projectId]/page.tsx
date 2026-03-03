import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import CodeEditor from "./Editor";
import CreateFile from "./CreateFile";

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
  params: { projectId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!session.user?.id) redirect("/login");

  const files = await getFiles(params.projectId, session.user.id);

  const selectedFile = files[0];

  return (
    <div style={{ padding: "40px" }}>
      <h1>Project Files</h1>
      <CreateFile projectId={params.projectId} />

      {files.length === 0 && (
        <p>No files yet. Create one to open Monaco editor.</p>
      )}

      {files.map((file) => (
        <div key={file.id}>{file.name}</div>
      ))}

      {selectedFile && <CodeEditor file={selectedFile} />}
    </div>
  );
}
