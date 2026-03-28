import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/currentUser";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  isValidObjectId,
  normalizeEmail,
  parseJsonObject,
} from "@/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const rateLimit = checkRateLimit(req, "project-invite", 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many invite attempts" },
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

  const normalizedEmail = normalizeEmail(body.email);
  const normalizedRole = body.role === "viewer" ? "viewer" : "editor";

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.id === project.ownerId) {
    return NextResponse.json(
      { error: "Owner already has access" },
      { status: 400 }
    );
  }

  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id,
    },
  });

  if (existingMember) {
    const updated = await prisma.projectMember.update({
      where: { id: existingMember.id },
      data: { role: normalizedRole },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  }

  const member = await prisma.projectMember.create({
    data: {
      userId: user.id,
      projectId,
      role: normalizedRole,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return NextResponse.json(member);
}
