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
