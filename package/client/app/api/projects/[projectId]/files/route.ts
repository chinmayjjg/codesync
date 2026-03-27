import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { getProjectAccess } from "../../../../../lib/projectAccess";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, type, parentId } = await req.json();
  const normalizedType = type === "folder" ? "folder" : "file";

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const access = await getProjectAccess(projectId, session.user.id);
  if (!access?.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await prisma.file.create({
    data: {
      name: String(name).trim(),
      content: "",
      projectId,
      parentId: parentId || null,
      type: normalizedType,
    },
  });

  return NextResponse.json(file);
}

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

  const files = await prisma.file.findMany({
    where: { projectId: projectId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(files);
}
