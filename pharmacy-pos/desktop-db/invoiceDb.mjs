import { prisma } from "./prismaClient.mjs";

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
