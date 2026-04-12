import { prisma } from "./prismaClient.mjs";

const INVOICE_NUMBER_PREFIX = "INV-";
const INVOICE_NUMBER_PADDING = 6;

const parseInvoiceSequence = (invoiceNumber) => {
  const normalized = String(invoiceNumber || "")
    .trim()
    .toUpperCase();
  const match = normalized.match(/^INV-(\d+)$/);
  if (!match) {
    return null;
  }

  const sequence = Number(match[1]);
  return Number.isFinite(sequence) ? sequence : null;
};

const formatInvoiceNumber = (sequence) =>
  `${INVOICE_NUMBER_PREFIX}${String(sequence).padStart(INVOICE_NUMBER_PADDING, "0")}`;

export const getNextInvoiceNumber = async () => {
  const rows = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
  });

  const maxSequence = rows.reduce((max, row) => {
    const sequence = parseInvoiceSequence(row.invoiceNumber);
    if (!Number.isFinite(sequence)) {
      return max;
    }

    return Math.max(max, sequence);
  }, 0);

  return formatInvoiceNumber(maxSequence + 1);
};

export const saveInvoice = async ({
  invoiceNumber,
  productName,
  price,
  qty,
  customerName,
}) => {
  const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
  const normalizedProductName = String(productName || "").trim();
  const normalizedCustomerName = String(customerName || "").trim();
  const numericPrice = Number(price);
  const numericQty = Number(qty);

  if (!normalizedProductName || !normalizedCustomerName) {
    throw new Error("Invoice requires productName and customerName.");
  }

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("Invoice price must be a valid number >= 0.");
  }

  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    throw new Error("Invoice qty must be a valid number > 0.");
  }

  return prisma.invoice.create({
    data: {
      invoiceNumber: normalizedInvoiceNumber,
      productName: normalizedProductName,
      price: numericPrice,
      qty: Math.floor(numericQty),
      customerName: normalizedCustomerName,
    },
  });
};

export const listInvoices = async ({
  search = "",
  customerName = "",
  fromDate,
  toDate,
} = {}) => {
  const andConditions = [];

  if (search) {
    andConditions.push({
      OR: [
        {
          invoiceNumber: {
            contains: search,
          },
        },
        {
          productName: {
            contains: search,
          },
        },
        {
          customerName: {
            contains: search,
          },
        },
      ],
    });
  }

  if (customerName) {
    andConditions.push({
      customerName: {
        contains: customerName,
      },
    });
  }

  if (fromDate || toDate) {
    const createdAt = {};
    if (fromDate) {
      createdAt.gte = new Date(fromDate);
    }
    if (toDate) {
      createdAt.lte = new Date(toDate);
    }
    andConditions.push({ createdAt });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  return prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

export const deleteInvoice = async ({ invoiceNumber, lineIds = [] }) => {
  const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
  const normalizedLineIds = (Array.isArray(lineIds) ? lineIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!normalizedInvoiceNumber && normalizedLineIds.length === 0) {
    throw new Error("invoiceNumber or lineIds is required to delete invoice.");
  }

  if (normalizedLineIds.length > 0) {
    return prisma.invoice.deleteMany({
      where: {
        id: {
          in: normalizedLineIds,
        },
      },
    });
  }

  return prisma.invoice.deleteMany({
    where: {
      invoiceNumber: normalizedInvoiceNumber,
    },
  });
};
