const STORAGE_KEY = "pharmacy-pos-invoices-v1";

let saveInFlightPromise = null;
let lastSavedFingerprint = "";
let lastSavedResult = null;

const getDesktopBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.pharmacyDb || null;
};

const readLocalInvoices = () => {
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

const writeLocalInvoices = (invoices) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
};

const buildSaveFingerprint = ({ lineItems }) => {
  const normalizedItems = (lineItems || []).map((item) => ({
    name: String(item?.name || "")
      .trim()
      .toLowerCase(),
    price: Number(item?.price || 0),
    qty: Number(item?.quantity || 1),
  }));

  return JSON.stringify({
    items: normalizedItems,
  });
};

export const saveInvoiceLines = async ({ customerName, lineItems }) => {
  if (saveInFlightPromise) {
    return saveInFlightPromise;
  }

  const fingerprint = buildSaveFingerprint({ lineItems });
  if (lastSavedResult && lastSavedFingerprint === fingerprint) {
    return {
      ...lastSavedResult,
      duplicatePrevented: true,
    };
  }

  saveInFlightPromise = (async () => {
    const invoiceNumber = generateInvoiceNumber();
    const bridge = getDesktopBridge();

    if (bridge?.saveInvoice) {
      const result = await Promise.all(
        (lineItems || []).map((item) =>
          bridge.saveInvoice({
            invoiceNumber,
            productName: item.name,
            price: item.price,
            qty: item.quantity,
            customerName,
          }),
        ),
      );

      const resultPayload = {
        invoiceNumber,
        rowsSaved: result.length,
      };
      lastSavedFingerprint = fingerprint;
      lastSavedResult = resultPayload;
      return resultPayload;
    }

    const invoices = readLocalInvoices();
    const createdAt = new Date().toISOString();
    const created = (lineItems || []).map((item, index) => ({
      id: Date.now() + index,
      invoiceNumber,
      productName: item.name,
      price: Number(item.price) || 0,
      qty: Number(item.quantity) || 1,
      customerName,
      createdAt,
    }));
    writeLocalInvoices([...created, ...invoices]);
    const resultPayload = {
      invoiceNumber,
      rowsSaved: created.length,
    };
    lastSavedFingerprint = fingerprint;
    lastSavedResult = resultPayload;
    return resultPayload;
  })();

  try {
    return await saveInFlightPromise;
  } finally {
    saveInFlightPromise = null;
  }
};

export const listInvoiceLines = async ({
  search = "",
  customerName = "",
} = {}) => {
  const bridge = getDesktopBridge();

  if (bridge?.listInvoices) {
    return bridge.listInvoices({ search, customerName });
  }

  const normalizedSearch = String(search || "")
    .trim()
    .toLowerCase();
  const normalizedCustomer = String(customerName || "")
    .trim()
    .toLowerCase();
  return readLocalInvoices().filter((invoice) => {
    const searchText =
      `${invoice.invoiceNumber || ""} ${invoice.productName} ${invoice.customerName}`.toLowerCase();
    const matchesSearch =
      !normalizedSearch || searchText.includes(normalizedSearch);
    const matchesCustomer =
      !normalizedCustomer ||
      String(invoice.customerName || "")
        .toLowerCase()
        .includes(normalizedCustomer);
    return matchesSearch && matchesCustomer;
  });
};

export const deleteInvoiceGroup = async ({ invoiceNumber, lineIds = [] }) => {
  const normalizedInvoiceNumber = String(invoiceNumber || "").trim();
  const normalizedLineIds = (Array.isArray(lineIds) ? lineIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (!normalizedInvoiceNumber && normalizedLineIds.length === 0) {
    throw new Error("رقم الفاتورة أو سطور الفاتورة مطلوبة للحذف.");
  }

  const bridge = getDesktopBridge();
  if (bridge?.deleteInvoice) {
    try {
      const result = await bridge.deleteInvoice({
        invoiceNumber: normalizedInvoiceNumber,
        lineIds: normalizedLineIds,
      });

      return {
        deletedCount: Number(result?.count || 0),
      };
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("No handler registered for 'invoice:delete'")) {
        throw new Error(
          "نسخة تطبيق سطح المكتب قديمة. اغلق التطبيق وشغله مرة أخرى (dev:desktop) لتفعيل حذف الفاتورة.",
        );
      }

      throw error;
    }
  }

  const invoices = readLocalInvoices();
  const lineIdSet = new Set(normalizedLineIds);
  const remaining = invoices.filter((invoice) => {
    const invoiceNumberMatches =
      normalizedInvoiceNumber &&
      String(invoice.invoiceNumber || "").trim() === normalizedInvoiceNumber;
    const lineIdMatches =
      lineIdSet.size > 0 && lineIdSet.has(Number(invoice.id));

    return !(invoiceNumberMatches || lineIdMatches);
  });
  writeLocalInvoices(remaining);

  return {
    deletedCount: invoices.length - remaining.length,
  };
};
