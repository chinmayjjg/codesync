import { prisma } from "../../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserRecord } from "../../../../../../../lib/currentUser";
import { listFileVersions, recordFileVersion } from "../../../../../../../lib/fileVersions";
import { getFileAccess } from "../../../../../../../lib/projectAccess";
import { checkRateLimit } from "../../../../../../../lib/rateLimit";
import {
  isValidObjectId,
  parseJsonObject,
} from "../../../../../../../lib/validation";

function resolveFileIdParam(params: { FileId?: string; fileId?: string }) {
  return params.FileId ?? params.fileId ?? "";
}

export async function GET(
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

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileAccess = await getFileAccess(fileId, currentUser.id);
  if (!fileAccess?.access.canRead || fileAccess.access.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const versions = await listFileVersions(fileId);
  return NextResponse.json(versions);
}

export async function POST(
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

  const rateLimit = await checkRateLimit(req, "restore-file-version", 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many restore attempts" },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileAccess = await getFileAccess(fileId, currentUser.id);
  if (!fileAccess?.access.canWrite || fileAccess.access.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseJsonObject(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const versionId =
    typeof body.versionId === "string" && body.versionId.trim()
      ? body.versionId.trim()
      : "";

  if (!isValidObjectId(versionId)) {
    return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
  }

  const fileVersionDelegate = (prisma as typeof prisma & {
    fileVersion: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        fileId: string;
        projectId: string;
        content: string;
      } | null>;
    };
  }).fileVersion;

  const version = await fileVersionDelegate.findUnique({
    where: { id: versionId },
  });

  if (!version || version.fileId !== fileId || version.projectId !== projectId) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: { content: version.content },
  });

  await recordFileVersion({
    fileId,
    projectId,
    content: version.content,
    createdById: currentUser.id,
    restoredFromVersionId: version.id,
  });

  return NextResponse.json(updatedFile);
}
