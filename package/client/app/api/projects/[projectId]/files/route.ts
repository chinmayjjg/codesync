import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getProjectAccess } from "../../../../../lib/projectAccess";
import { getCurrentUserRecord } from "../../../../../lib/currentUser";
import { checkRateLimit } from "../../../../../lib/rateLimit";
import {
  isValidObjectId,
  parseJsonObject,
  sanitizeSingleLineText,
} from "../../../../../lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(req, "create-file", 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many file operations" },
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

  const name = sanitizeSingleLineText(body.name, 120);
  const normalizedType = body.type === "folder" ? "folder" : "file";
  const parentId =
    typeof body.parentId === "string" && body.parentId.trim()
      ? body.parentId.trim()
      : null;

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  if (parentId && !isValidObjectId(parentId)) {
    return NextResponse.json({ error: "Invalid parent id" }, { status: 400 });
  }

  const access = await getProjectAccess(projectId, currentUser.id);
  if (!access?.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parentId) {
    const parentWhere = {
      id: parentId,
      projectId,
      type: "folder",
    } as Prisma.FileWhereInput;

    const parent = await prisma.file.findFirst({
      where: parentWhere,
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent folder not found" },
        { status: 400 }
      );
    }
  }

  const siblingWhere = {
    projectId,
    parentId,
    name,
  } as Prisma.FileWhereInput;

  const existingSibling = await prisma.file.findFirst({
    where: siblingWhere,
    select: { id: true },
  });

  if (existingSibling) {
    return NextResponse.json(
      { error: "A file or folder with that name already exists here" },
      { status: 409 }
    );
  }

  const fileData = {
    name,
    content: "",
    projectId,
    parentId,
    type: normalizedType,
  } as Prisma.FileUncheckedCreateInput;

  const file = await prisma.file.create({
    data: fileData,
  });

  return NextResponse.json(file);
}

export async function GET(
  req: NextRequest,
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

  const files = await prisma.file.findMany({
    where: { projectId: projectId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(files);
}
