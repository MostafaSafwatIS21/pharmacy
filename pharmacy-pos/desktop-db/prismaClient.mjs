import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const datasourceUrl = process.env.PHARMACY_DB_URL || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}),
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export const ensureDesktopSchema = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CatalogState" (
      "id" INTEGER NOT NULL PRIMARY KEY,
      "headersJson" TEXT NOT NULL,
      "mappingJson" TEXT NOT NULL,
      "sourceFileName" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "location" TEXT NOT NULL,
      "phoneNumber" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "invoiceNumber" TEXT NOT NULL DEFAULT '',
      "productName" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "qty" INTEGER NOT NULL,
      "customerName" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Invoice"
      ADD COLUMN "invoiceNumber" TEXT NOT NULL DEFAULT ''
    `);
  } catch {
    // Column already exists in databases that were already upgraded.
  }
};
