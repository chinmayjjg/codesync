import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedRole = role === "viewer" ? "viewer" : "editor";

  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.ownerId !== session.user.id) {
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
