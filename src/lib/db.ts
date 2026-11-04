import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * PrismaClient singleton (Prisma 7 wajib pakai driver adapter).
 * Import dari sini: `import { prisma } from "@/lib/db"`.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/spmtrade",
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
