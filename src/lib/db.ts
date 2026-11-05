import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * PrismaClient singleton (Prisma 7 wajib pakai driver adapter).
 * Import dari sini: `import { prisma } from "@/lib/db"`.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Fallback lokal hanya untuk development: di production, DATABASE_URL yang
// lupa diset harus gagal cepat dengan pesan jelas, bukan diam-diam mencoba
// Postgres lokal lalu gagal dengan error koneksi yang membingungkan.
const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "postgresql://postgres:postgres@localhost:5432/neuraly");

if (!connectionString) {
  throw new Error("DATABASE_URL belum diset.");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
