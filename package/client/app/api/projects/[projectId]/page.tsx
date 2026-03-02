import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

async function getFiles(projectId: string) {
  const res = await fetch(
    `http://localhost:3000/api/projects/${projectId}/files`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const session = await getServerSession();

  if (!session) redirect("/login");

  const files = await getFiles(params.projectId);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Project Files</h1>

      {files.length === 0 && <p>No files yet.</p>}

      {files.map((file: any) => (
        <div key={file.id}>{file.name}</div>
      ))}
    </div>
  );
}