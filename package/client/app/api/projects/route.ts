import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

// GET /api/projects – list all projects owned by the logged-in user
export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { projects: { include: { files: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user.projects);
}

// POST /api/projects – create a new project for the logged-in user
export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        ownerId: user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}