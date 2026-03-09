import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ FileId: string }> }
) {
  const { FileId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();

  const file = await prisma.file.findUnique({
    where: { id: FileId },
    include: { project: true },
  });

  if (!file || file.project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedFile = await prisma.file.update({
    where: { id: FileId },
    data: { content },
  });

  return NextResponse.json(updatedFile);
}
