const STORAGE_KEY = "pharmacy-pos-invoices-v1";

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

export const saveInvoiceLines = async ({ customerName, lineItems }) => {
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

    return {
      invoiceNumber,
      rowsSaved: result.length,
    };
  }

  const invoices = readLocalInvoices();
  const now = new Date().toISOString();
  const created = (lineItems || []).map((item, index) => ({
    id: Date.now() + index,
    invoiceNumber,
    productName: item.name,
    price: Number(item.price) || 0,
    qty: Number(item.quantity) || 1,
    customerName,
    createdAt: now,
  }));
  writeLocalInvoices([...created, ...invoices]);
  return {
    invoiceNumber,
    rowsSaved: created.length,
  };
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
      `${invoice.productName} ${invoice.customerName}`.toLowerCase();
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
