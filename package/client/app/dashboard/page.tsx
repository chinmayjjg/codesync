import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import CreateProject from "./CreateProject";

type DashboardProject = {
  id: string;
  name: string;
  createdAt: Date;
  fileCount: number;
};

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const projects: DashboardProject[] = session.user?.id
    ? await Promise.all(
        (
          await prisma.project.findMany({
            where: { ownerId: session.user.id },
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          })
        ).map(async (project) => ({
          ...project,
          fileCount: await prisma.file.count({
            where: { projectId: project.id },
          }),
        }))
      )
    : [];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-hero">
        <div>
          <p className="workspace-eyebrow">Project hub</p>
          <h1 className="workspace-title">
            Welcome back{session.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="dashboard-subcopy">
            Launch a workspace, invite collaborators, and jump back into the
            files that matter.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <span className="status-pill status-pill-neutral">
            {session.user?.email}
          </span>
          <Link href="/" className="secondary-action marketing-link">
            Product overview
          </Link>
        </div>
      </header>

      <CreateProject initialProjects={projects} />
    </main>
  );
}
