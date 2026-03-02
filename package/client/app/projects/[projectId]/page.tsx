import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import CreateFile from "./CreateFile";
import { prisma } from "../../../lib/prisma";

export default async function ProjectPage({
    params,
}: {
    params: { projectId: string };
}) {
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    // Ensure we have a projectId param
    const projectId = params?.projectId;
    if (!projectId) {
        return (
            <div style={{ padding: "40px" }}>
                <h1>Project Files</h1>
                <p>Missing project id.</p>
            </div>
        );
    }

    // Verify ownership and load files server-side via Prisma (avoids HTTP fetch and ensures array)
    let project;
    try {
        project = await prisma.project.findUnique({ where: { id: projectId } });
    } catch (err) {
        console.error("Prisma findUnique error:", err);
        return (
            <div style={{ padding: "40px" }}>
                <h1>Project Files</h1>
                <p>Unable to load project.</p>
            </div>
        );
    }

    if (!project || project.ownerId !== session.user?.id) {
        return (
            <div style={{ padding: "40px" }}>
                <h1>Project Files</h1>
                <p>Forbidden or project not found.</p>
            </div>
        );
    }

    let files = [];
    try {
        files = await prisma.file.findMany({
            where: { projectId },
            orderBy: { updatedAt: "desc" },
        });
    } catch (err) {
        console.error("Prisma findMany error:", err);
        files = [];
    }

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
