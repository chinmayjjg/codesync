import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { getProjectAccess } from "../../../../../lib/projectAccess";
import { getProjectCollaborators } from "../../../../../lib/projectCollaborators";
import { getCurrentUserRecord } from "../../../../../lib/currentUser";
import { isValidObjectId } from "../../../../../lib/validation";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getProjectAccess(projectId, currentUser.id);
  if (!access?.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const collaborators = await getProjectCollaborators(projectId);
  if (!collaborators) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(collaborators);
}
