const STORAGE_KEY = "pharmacy-pos-customers-v1";

const getDesktopBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.pharmacyDb || null;
};

const isMissingHandlerError = (error) =>
  String(error?.message || error || "").includes("No handler registered");

const readLocalCustomers = () => {
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

const writeLocalCustomers = (customers) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
};

const normalize = ({ id, name, location, phoneNumber }) => ({
  id: id ?? Date.now(),
  name: String(name || "").trim(),
  location: String(location || "").trim(),
  phoneNumber: String(phoneNumber || "").trim(),
});

export const listCustomers = async ({ search = "" } = {}) => {
  const bridge = getDesktopBridge();

  if (bridge?.listCustomers) {
    try {
      return await bridge.listCustomers({ search });
    } catch (error) {
      if (!isMissingHandlerError(error)) {
        throw error;
      }
    }
  }

  const normalizedSearch = String(search || "")
    .trim()
    .toLowerCase();
  const customers = readLocalCustomers();

  if (!normalizedSearch) {
    return customers;
  }

  return customers.filter((customer) =>
    [customer.name, customer.location, customer.phoneNumber]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch),
  );
};

export const addCustomer = async (payload) => {
  const bridge = getDesktopBridge();

  if (bridge?.addCustomer) {
    try {
      return await bridge.addCustomer(payload);
    } catch (error) {
      if (!isMissingHandlerError(error)) {
        throw error;
      }
    }
  }

  const customer = normalize(payload);
  const customers = readLocalCustomers();
  customers.push(customer);
  writeLocalCustomers(customers);
  return customer;
};

export const updateCustomer = async (payload) => {
  const bridge = getDesktopBridge();

  if (bridge?.updateCustomer) {
    try {
      return await bridge.updateCustomer(payload);
    } catch (error) {
      if (!isMissingHandlerError(error)) {
        throw error;
      }
    }
  }

  const customer = normalize(payload);
  const customers = readLocalCustomers().map((item) =>
    Number(item.id) === Number(customer.id) ? customer : item,
  );
  writeLocalCustomers(customers);
  return customer;
};

export const deleteCustomer = async ({ id, name }) => {
  const bridge = getDesktopBridge();

  if (bridge?.deleteCustomer) {
    try {
      return await bridge.deleteCustomer({ id, name });
    } catch (error) {
      if (!isMissingHandlerError(error)) {
        throw error;
      }
    }
  }

  const normalizedName = String(name || "").trim();
  const hasValidId = Number.isFinite(Number(id));

  const customers = readLocalCustomers().filter((item) => {
    if (hasValidId) {
      return Number(item.id) !== Number(id);
    }

    return String(item.name || "").trim() !== normalizedName;
  });
  writeLocalCustomers(customers);
  return { id, name };
};
