import { saveInvoiceLines } from "./invoiceDataSource";

const STORAGE_KEY = "pharmacy-pos-quotations-v1";
const QUOTE_NUMBER_PREFIX = "QTN-";
const QUOTE_NUMBER_PADDING = 6;

const getDesktopBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.pharmacyDb || null;
};

const readLocalQuotations = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalQuotations = (rows) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

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

const getNextLocalQuoteNumber = () => {
  const maxSequence = readLocalQuotations().reduce((max, quote) => {
    const sequence = parseQuoteSequence(quote.quoteNumber);
    if (!Number.isFinite(sequence)) {
      return max;
    }

    return Math.max(max, sequence);
  }, 0);

  return formatQuoteNumber(maxSequence + 1);
};

export const saveQuotationLines = async ({
  customerName,
  customerPhone,
  customerLocation,
  representative,
  taxRate,
  lineItems,
}) => {
  const bridge = getDesktopBridge();

  if (bridge?.saveQuotation) {
    const quoteNumber = bridge.getNextQuoteNumber
      ? await bridge.getNextQuoteNumber()
      : getNextLocalQuoteNumber();

    return bridge.saveQuotation({
      quoteNumber,
      customerName,
      customerPhone,
      customerLocation,
      representative,
      taxRate,
      lineItems,
    });
  }

  const quoteNumber = getNextLocalQuoteNumber();
  const createdAt = new Date().toISOString();
  const created = (lineItems || []).map((item, index) => ({
    id: Date.now() + index,
    quoteNumber,
    customerName,
    customerPhone: customerPhone || "",
    customerLocation: customerLocation || "",
    representative,
    taxRate: Number(taxRate || 0),
    productName: item.name,
    price: Number(item.price) || 0,
    qty: Number(item.quantity) || 1,
    status: "PENDING",
    approvedInvoiceNumber: "",
    createdAt,
  }));

  writeLocalQuotations([...created, ...readLocalQuotations()]);

  return {
    quoteNumber,
    rowsSaved: created.length,
  };
};

export const listQuotationLines = async ({ search = "", status = "" } = {}) => {
  const bridge = getDesktopBridge();

  if (bridge?.listQuotations) {
    return bridge.listQuotations({ search, status });
  }

  const normalizedSearch = String(search || "")
    .trim()
    .toLowerCase();
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  return readLocalQuotations().filter((quote) => {
    const text =
      `${quote.quoteNumber || ""} ${quote.customerName || ""} ${quote.productName || ""} ${quote.representative || ""}`.toLowerCase();
    const statusText = String(quote.status || "PENDING").toUpperCase();
    const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
    const matchesStatus = !normalizedStatus || statusText === normalizedStatus;
    return matchesSearch && matchesStatus;
  });
};

export const approveQuotationToInvoice = async ({ quoteNumber }) => {
  const normalizedQuoteNumber = String(quoteNumber || "").trim();
  if (!normalizedQuoteNumber) {
    throw new Error("رقم عرض السعر مطلوب.");
  }

  const bridge = getDesktopBridge();
  if (bridge?.approveQuotation) {
    return bridge.approveQuotation({ quoteNumber: normalizedQuoteNumber });
  }

  const rows = readLocalQuotations().filter(
    (row) => String(row.quoteNumber || "").trim() === normalizedQuoteNumber,
  );

  if (!rows.length) {
    throw new Error("عرض السعر غير موجود.");
  }

  if (String(rows[0].status || "").toUpperCase() === "APPROVED") {
    return {
      quoteNumber: normalizedQuoteNumber,
      invoiceNumber: rows[0].approvedInvoiceNumber || "",
      rowsApproved: 0,
      alreadyApproved: true,
    };
  }

  const result = await saveInvoiceLines({
    customerName: rows[0].customerName,
    lineItems: rows.map((row) => ({
      name: row.productName,
      price: Number(row.price || 0),
      quantity: Number(row.qty || 1),
    })),
  });

  const invoiceNumber = result.invoiceNumber;
  const updated = readLocalQuotations().map((row) => {
    if (String(row.quoteNumber || "").trim() !== normalizedQuoteNumber) {
      return row;
    }

    return {
      ...row,
      status: "APPROVED",
      approvedInvoiceNumber: invoiceNumber,
      updatedAt: new Date().toISOString(),
    };
  });
  writeLocalQuotations(updated);

  return {
    quoteNumber: normalizedQuoteNumber,
    invoiceNumber,
    rowsApproved: rows.length,
    alreadyApproved: false,
  };
};

export const deleteQuotationGroup = async ({ quoteNumber }) => {
  const normalizedQuoteNumber = String(quoteNumber || "").trim();
  if (!normalizedQuoteNumber) {
    throw new Error("رقم عرض السعر مطلوب.");
  }

  const bridge = getDesktopBridge();
  if (bridge?.deleteQuotation) {
    const result = await bridge.deleteQuotation({
      quoteNumber: normalizedQuoteNumber,
    });
    return {
      deletedCount: Number(result?.count || 0),
    };
  }

  const rows = readLocalQuotations();
  const targetRows = rows.filter(
    (row) => String(row.quoteNumber || "").trim() === normalizedQuoteNumber,
  );

  if (!targetRows.length) {
    throw new Error("عرض السعر غير موجود.");
  }

  const isApproved = targetRows.some(
    (row) => String(row.status || "").toUpperCase() === "APPROVED",
  );
  if (isApproved) {
    throw new Error("لا يمكن حذف عرض سعر تم تحويله إلى فاتورة.");
  }

  const remaining = rows.filter(
    (row) => String(row.quoteNumber || "").trim() !== normalizedQuoteNumber,
  );
  writeLocalQuotations(remaining);

  return {
    deletedCount: rows.length - remaining.length,
  };
};

export const deleteQuotationByInvoiceNumber = async ({ invoiceNumber }) => {
  const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
  if (!normalizedInvoiceNumber) {
    throw new Error("رقم الفاتورة مطلوب.");
  }

  const bridge = getDesktopBridge();
  if (bridge?.deleteQuotationByInvoice) {
    const result = await bridge.deleteQuotationByInvoice({
      invoiceNumber: normalizedInvoiceNumber,
    });
    return {
      deletedCount: Number(result?.count || 0),
    };
  }

  const rows = readLocalQuotations();
  const remaining = rows.filter(
    (row) =>
      String(row.approvedInvoiceNumber || "").trim() !==
      normalizedInvoiceNumber,
  );
  writeLocalQuotations(remaining);

  return {
    deletedCount: rows.length - remaining.length,
  };
};
