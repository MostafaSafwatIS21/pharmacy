import prismaClientPkg from "@prisma/client";

const { PrismaClient } = prismaClientPkg;

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

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Quotation" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "quoteNumber" TEXT NOT NULL DEFAULT '',
      "customerName" TEXT NOT NULL,
      "customerPhone" TEXT NOT NULL DEFAULT '',
      "customerLocation" TEXT NOT NULL DEFAULT '',
      "representative" TEXT NOT NULL,
      "taxRate" REAL NOT NULL DEFAULT 0,
      "productName" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "qty" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "approvedInvoiceNumber" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_product_name" ON "Product"("name")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_product_createdAt" ON "Product"("createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_customer_name" ON "Customer"("name")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_customer_phoneNumber" ON "Customer"("phoneNumber")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_customer_createdAt" ON "Customer"("createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_invoice_invoiceNumber" ON "Invoice"("invoiceNumber")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_invoice_productName" ON "Invoice"("productName")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_invoice_customerName" ON "Invoice"("customerName")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_invoice_createdAt" ON "Invoice"("createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_quotation_quoteNumber" ON "Quotation"("quoteNumber")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_quotation_approvedInvoiceNumber" ON "Quotation"("approvedInvoiceNumber")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_quotation_status" ON "Quotation"("status")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "idx_quotation_createdAt" ON "Quotation"("createdAt")`,
  );
};
