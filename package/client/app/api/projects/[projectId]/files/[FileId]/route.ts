import { prisma } from "../../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: { FileId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();

  const file = await prisma.file.findUnique({
    where: { id: params.FileId },
    include: { project: true },
  });

  if (!file || file.project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedFile = await prisma.file.update({
    where: { id: params.FileId },
    data: { content },
  });

  return NextResponse.json(updatedFile);
}
