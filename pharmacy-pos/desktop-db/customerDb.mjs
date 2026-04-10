import { prisma } from "./prismaClient.mjs";

export const addCustomer = async ({ name, location, phoneNumber }) => {
  const normalizedName = String(name || "").trim();
  const normalizedLocation = String(location || "").trim();
  const normalizedPhone = String(phoneNumber || "").trim();

  if (!normalizedName || !normalizedLocation || !normalizedPhone) {
    throw new Error("Customer requires name, location, and phone number.");
  }

  return prisma.customer.create({
    data: {
      name: normalizedName,
      location: normalizedLocation,
      phoneNumber: normalizedPhone,
    },
  });
};

export const listCustomers = async ({ search = "" } = {}) => {
  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            location: {
              contains: search,
            },
          },
          {
            phoneNumber: {
              contains: search,
            },
          },
        ],
      }
    : {};

  return prisma.customer.findMany({
    where,
    orderBy: { id: "asc" },
  });
};

export const updateCustomer = async ({ id, name, location, phoneNumber }) => {
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) {
    throw new Error("Customer id is required.");
  }

  const normalizedName = String(name || "").trim();
  const normalizedLocation = String(location || "").trim();
  const normalizedPhone = String(phoneNumber || "").trim();

  if (!normalizedName || !normalizedLocation || !normalizedPhone) {
    throw new Error("Customer requires name, location, and phone number.");
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      name: normalizedName,
      location: normalizedLocation,
      phoneNumber: normalizedPhone,
    },
  });
};

export const deleteCustomer = async ({ id, name }) => {
  const customerId = Number(id);
  const normalizedName = String(name || "").trim();

  if (Number.isFinite(customerId)) {
    return prisma.customer.delete({
      where: { id: customerId },
    });
  }

  if (!normalizedName) {
    throw new Error("Customer id or name is required.");
  }

  return prisma.customer.deleteMany({
    where: {
      name: normalizedName,
    },
  });
};
