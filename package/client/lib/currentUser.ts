import type { Session } from "next-auth";
import { prisma } from "./prisma";

export async function getCurrentUserRecord(session: Session | null) {
  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
