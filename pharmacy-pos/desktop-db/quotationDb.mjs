import { prisma } from "./prismaClient.mjs";
import { getNextInvoiceNumber } from "./invoiceDb.mjs";

const QUOTE_NUMBER_PREFIX = "QTN-";
const QUOTE_NUMBER_PADDING = 6;

const parseQuoteSequence = (quoteNumber) => {
  const normalized = String(quoteNumber || "")
    .trim()
    .toUpperCase();
  const match = normalized.match(/^QTN-(\d+)$/);
  if (!match) {
    return null;
  }

  const sequence = Number(match[1]);
  return Number.isFinite(sequence) ? sequence : null;
};

const formatQuoteNumber = (sequence) =>
  `${QUOTE_NUMBER_PREFIX}${String(sequence).padStart(QUOTE_NUMBER_PADDING, "0")}`;

export const getNextQuoteNumber = async () => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "quoteNumber" FROM "Quotation" WHERE "quoteNumber" LIKE 'QTN-%' ORDER BY "id" DESC LIMIT 500`,
  );

  const maxSequence = rows.reduce((max, row) => {
    const sequence = parseQuoteSequence(row.quoteNumber);
    if (!Number.isFinite(sequence)) {
      return max;
    }

    return Math.max(max, sequence);
  }, 0);

  return formatQuoteNumber(maxSequence + 1);
};

export const saveQuotation = async ({
  quoteNumber,
  customerName,
  customerPhone = "",
  customerLocation = "",
  representative,
  taxRate,
  lineItems,
}) => {
  const normalizedQuoteNumber = String(quoteNumber || "").trim();
  const normalizedCustomerName = String(customerName || "").trim();
  const normalizedRepresentative = String(representative || "").trim();
  const normalizedCustomerPhone = String(customerPhone || "").trim();
  const normalizedCustomerLocation = String(customerLocation || "").trim();
  const numericTaxRate = Number(taxRate);

  if (!normalizedQuoteNumber || !normalizedCustomerName) {
    throw new Error("Quotation requires quoteNumber and customerName.");
  }

  if (!normalizedRepresentative) {
    throw new Error("Quotation requires representative.");
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error("Quotation line items are required.");
  }

  if (!Number.isFinite(numericTaxRate) || numericTaxRate < 0) {
    throw new Error("Quotation taxRate must be a valid number >= 0.");
  }

  await prisma.$transaction(
    lineItems.map((item) => {
      const normalizedProductName = String(item?.name || "").trim();
      const numericPrice = Number(item?.price);
      const numericQty = Number(item?.quantity || 1);

      if (!normalizedProductName) {
        throw new Error("Quotation product name is required.");
      }

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new Error("Quotation item price must be a valid number >= 0.");
      }

      if (!Number.isFinite(numericQty) || numericQty <= 0) {
        throw new Error("Quotation item quantity must be a valid number > 0.");
      }

      return prisma.$executeRawUnsafe(
        `INSERT INTO "Quotation" (
          "quoteNumber", "customerName", "customerPhone", "customerLocation", "representative",
          "taxRate", "productName", "price", "qty", "status", "approvedInvoiceNumber"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', '')`,
        normalizedQuoteNumber,
        normalizedCustomerName,
        normalizedCustomerPhone,
        normalizedCustomerLocation,
        normalizedRepresentative,
        numericTaxRate,
        normalizedProductName,
        numericPrice,
        Math.floor(numericQty),
      );
    }),
  );

  return {
    quoteNumber: normalizedQuoteNumber,
    rowsSaved: lineItems.length,
  };
};

export const listQuotations = async ({ search = "", status = "" } = {}) => {
  let query = `SELECT * FROM "Quotation" WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (
      "quoteNumber" LIKE ? OR
      "productName" LIKE ? OR
      "customerName" LIKE ? OR
      "representative" LIKE ?
    )`;
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  if (status) {
    query += ` AND "status" = ?`;
    params.push(status);
  }

  query += ` ORDER BY "createdAt" DESC, "id" DESC`;

  return prisma.$queryRawUnsafe(query, ...params);
};

export const approveQuotation = async ({ quoteNumber }) => {
  const normalizedQuoteNumber = String(quoteNumber || "").trim();
  if (!normalizedQuoteNumber) {
    throw new Error("quoteNumber is required.");
  }

  const lines = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Quotation" WHERE "quoteNumber" = ? ORDER BY "id" ASC`,
    normalizedQuoteNumber,
  );

  if (!lines.length) {
    throw new Error("Quotation not found.");
  }

  const approvedInvoiceNumber = lines[0].approvedInvoiceNumber || "";
  if (
    String(lines[0].status || "").toUpperCase() === "APPROVED" &&
    approvedInvoiceNumber
  ) {
    return {
      quoteNumber: normalizedQuoteNumber,
      invoiceNumber: approvedInvoiceNumber,
      rowsApproved: 0,
      alreadyApproved: true,
    };
  }

  const invoiceNumber = await getNextInvoiceNumber();

  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      await tx.invoice.create({
        data: {
          invoiceNumber,
          productName: String(line.productName || "").trim(),
          price: Number(line.price || 0),
          qty: Math.max(1, Number(line.qty || 1)),
          customerName: String(line.customerName || "").trim(),
        },
      });
    }

    await tx.$executeRawUnsafe(
      `UPDATE "Quotation"
       SET "status" = 'APPROVED', "approvedInvoiceNumber" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "quoteNumber" = ?`,
      invoiceNumber,
      normalizedQuoteNumber,
    );
  });

  return {
    quoteNumber: normalizedQuoteNumber,
    invoiceNumber,
    rowsApproved: lines.length,
    alreadyApproved: false,
  };
};

export const deleteQuotation = async ({ quoteNumber }) => {
  const normalizedQuoteNumber = String(quoteNumber || "").trim();
  if (!normalizedQuoteNumber) {
    throw new Error("quoteNumber is required.");
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT "status", "approvedInvoiceNumber" FROM "Quotation" WHERE "quoteNumber" = ?`,
    normalizedQuoteNumber,
  );

  if (!rows.length) {
    throw new Error("Quotation not found.");
  }

  const isApproved = rows.some(
    (row) => String(row.status || "").toUpperCase() === "APPROVED",
  );

  if (isApproved) {
    throw new Error("لا يمكن حذف عرض سعر تم تحويله إلى فاتورة.");
  }

  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "Quotation" WHERE "quoteNumber" = ?`,
    normalizedQuoteNumber,
  );

  return {
    count: Number(result || 0),
  };
};

export const deleteQuotationByInvoiceNumber = async ({ invoiceNumber }) => {
  const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
  if (!normalizedInvoiceNumber) {
    throw new Error("invoiceNumber is required.");
  }

  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "Quotation" WHERE "approvedInvoiceNumber" = ?`,
    normalizedInvoiceNumber,
  );

  return {
    count: Number(result || 0),
  };
};
