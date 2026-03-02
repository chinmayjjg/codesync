import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import CreateFile from "./CreateFile";

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
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    const files = await getFiles(params.projectId);

    return (
        <div style={{ padding: "40px" }}>
            <h1>Project Files</h1>

            <CreateFile projectId={params.projectId} />

            {files.length === 0 && <p>No files yet.</p>}

            {files.map((file: { id: string; name: string }) => (
                <div key={file.id}>{file.name}</div>
            ))}
        </div>
    );
}
