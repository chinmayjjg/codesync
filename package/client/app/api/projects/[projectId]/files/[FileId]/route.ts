import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import { getFileAccess } from "../../../../../../lib/projectAccess";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ FileId: string }> }
) {
  const { FileId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: { content?: string; name?: string } = {};

  if ("content" in body) {
    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    updates.content = body.content;
  }

  if ("name" in body) {
    const trimmedName =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    updates.name = trimmedName;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const fileAccess = await getFileAccess(FileId, session.user.id);
  if (!fileAccess?.access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedFile = await prisma.file.update({
    where: { id: FileId },
    data: updates,
  });

  return NextResponse.json(updatedFile);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ FileId: string }> }
) {
  const { FileId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileAccess = await getFileAccess(FileId, session.user.id);
  if (!fileAccess?.access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete the file (folders are deleted without cascade since MongoDB doesn't auto-cascade)
  // For folders, we should also delete all children recursively
  const file = await prisma.file.findUnique({
    where: { id: FileId },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Type assertion due to MongoDB Prisma type generation issues
  const fileType = (file as unknown as { type: string }).type;

  if (fileType === "folder") {
    // Recursively find and delete all files in this folder and subfolders
    const deleteRecursively = async (parentId: string) => {
      const children = await prisma.file.findMany({
        where: { parentId: parentId },
      });
      for (const child of children) {
        await deleteRecursively(child.id);
      }
      await prisma.file.delete({ where: { id: parentId } });
    };
    await deleteRecursively(FileId);
  } else {
    await prisma.file.delete({ where: { id: FileId } });
  }

  return NextResponse.json({ success: true });
}
