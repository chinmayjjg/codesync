import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getProjectAccess } from "../../../../../lib/projectAccess";
import { getProjectCollaborators } from "../../../../../lib/projectCollaborators";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access?.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborators = await getProjectCollaborators(projectId);
  if (!collaborators) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(collaborators);
}
