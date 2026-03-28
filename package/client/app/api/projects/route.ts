import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUserRecord } from "../../../lib/currentUser";
import { checkRateLimit } from "../../../lib/rateLimit";
import {
  parseJsonObject,
  sanitizeSingleLineText,
} from "../../../lib/validation";

// GET /api/projects - list all projects owned by the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await getCurrentUserRecord(session);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { ownerId: currentUser.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        fileCount: await prisma.file.count({
          where: { projectId: project.id },
        }),
      }))
    );

    return NextResponse.json(projectsWithCounts);
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - create a new project for the logged-in user
export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, "create-project", 20, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many project creation attempts" },
      { status: 429 }
    );
  }

  const session = await getServerSession(authOptions);
  const currentUser = await getCurrentUserRecord(session);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await parseJsonObject(req);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const name = sanitizeSingleLineText(body.name, 120);

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        ownerId: user.id,
      },
    });

    return NextResponse.json(
      {
        ...project,
        fileCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
