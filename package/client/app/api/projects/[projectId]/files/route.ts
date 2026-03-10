import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { NextResponse } from "next/server";

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

  // Check ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await prisma.file.create({
    data: {
      name: String(name).trim(),
      content: "",
      projectId,
      parentId: parentId || null,
      type: normalizedType,
    } as never,
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await prisma.file.findMany({
    where: { projectId: projectId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(files);
}
