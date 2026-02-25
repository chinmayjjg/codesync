import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await prisma.user.create({
    data: {
      email: `test${Date.now()}@example.com`,
      name: "Test User",
    },
  });

  return NextResponse.json(user);
}