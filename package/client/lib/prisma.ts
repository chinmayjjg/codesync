import { PrismaClient } from "@prisma/client";
import { serverEnv } from "./env.server";

// Prevent multiple instances of Prisma Client in development
// https://www.prisma.io/docs/support/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
void serverEnv;

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
