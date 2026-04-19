import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { deleteProjectFileTree } from "../../../../../../lib/fileOperations";
import { recordFileVersion } from "../../../../../../lib/fileVersions";
import { getFileAccess } from "../../../../../../lib/projectAccess";
import { getCurrentUserRecord } from "../../../../../../lib/currentUser";
import { checkRateLimit } from "../../../../../../lib/rateLimit";
import {
  isValidObjectId,
  parseJsonObject,
  sanitizeFileContent,
  sanitizeSingleLineText,
} from "../../../../../../lib/validation";

function resolveFileIdParam(params: { FileId?: string; fileId?: string }) {
  return params.FileId ?? params.fileId ?? "";
}

export async function PUT(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; FileId?: string; fileId?: string }> }
) {
  const resolvedParams = await params;
  const projectId = resolvedParams.projectId;
  const fileId = resolveFileIdParam(resolvedParams);
  if (!isValidObjectId(projectId) || !isValidObjectId(fileId)) {
    return NextResponse.json({ error: "Invalid resource id" }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(req, "update-file", 120, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many file updates" },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonObject(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: { content?: string; name?: string } = {};

  if ("content" in body) {
    const content = sanitizeFileContent(body.content, 500_000);
    if (content === null) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    updates.content = content;
  }

  if ("name" in body) {
    const trimmedName = sanitizeSingleLineText(body.name, 120);
    if (!trimmedName) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    updates.name = trimmedName;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const fileAccess = await getFileAccess(fileId, currentUser.id);
  if (!fileAccess?.access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fileSelect = {
    id: true,
    projectId: true,
    parentId: true,
    type: true,
  } as Prisma.FileSelect;

  const file = (await prisma.file.findUnique({
    where: { id: fileId },
    select: fileSelect,
  })) as {
    id: string;
    projectId: string;
    parentId: string | null;
    type: string;
  } | null;

  if (!file || file.projectId !== projectId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (updates.name) {
    const siblingWhereInput: Record<string, unknown> = {
      projectId,
      parentId: file.parentId,
      name: updates.name,
      id: { not: fileId },
    };

    const existingSibling = await prisma.file.findFirst({
      where: siblingWhereInput as Prisma.FileWhereInput,
      select: { id: true },
    });

    if (existingSibling) {
      return NextResponse.json(
        { error: "A file or folder with that name already exists here" },
        { status: 409 }
      );
    }
  }

  const updateData = updates as Prisma.FileUpdateInput;

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: updateData,
  });

  if ("content" in updates && file.type === "file") {
    await recordFileVersion({
      fileId,
      projectId,
      content: updates.content ?? updatedFile.content,
      createdById: currentUser.id,
    });
  }

  return NextResponse.json(updatedFile);
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; FileId?: string; fileId?: string }> }
) {
  const resolvedParams = await params;
  const projectId = resolvedParams.projectId;
  const fileId = resolveFileIdParam(resolvedParams);
  if (!isValidObjectId(projectId) || !isValidObjectId(fileId)) {
    return NextResponse.json({ error: "Invalid resource id" }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(req, "delete-file", 40, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many delete attempts" },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileAccess = await getFileAccess(fileId, currentUser.id);
  if (!fileAccess?.access.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete the file (folders are deleted without cascade since MongoDB doesn't auto-cascade)
  // For folders, we should also delete all children recursively
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.projectId !== projectId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Type assertion due to MongoDB Prisma type generation issues
  const fileType = (file as unknown as { type: string }).type;

  if (fileType === "folder") {
    await deleteProjectFileTree(projectId, fileId);
  } else {
    await prisma.file.delete({ where: { id: fileId } });
  }

  return NextResponse.json({ success: true });
}
