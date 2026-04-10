import { prisma } from "./prismaClient.mjs";

const DEFAULT_MAPPING = {
  nameHeader: "name",
  priceHeader: "price",
  detailsHeader: null,
  typeHeader: null,
};

const parseNumber = (value) => {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseJsonSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const replaceProducts = async (products) => {
  const normalizedProducts = products
    .map((product) => ({
      name: String(product.name || "").trim(),
      price: Number(product.price),
    }))
    .filter(
      (product) =>
        product.name.length > 0 &&
        Number.isFinite(product.price) &&
        product.price >= 0,
    );

  await prisma.product.deleteMany();

  if (normalizedProducts.length > 0) {
    await prisma.product.createMany({
      data: normalizedProducts,
    });
  }

  return prisma.product.findMany({ orderBy: { id: "asc" } });
};

export const replaceCatalog = async ({ items, sourceFileName }) => {
  const validItems = (items || [])
    .map((item) => {
      const name = String(item?.name || "").trim();
      const price = parseNumber(item?.price);

      if (!name) {
        return null;
      }

      return {
        name,
        price,
      };
    })
    .filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany();

    if (validItems.length > 0) {
      await tx.product.createMany({ data: validItems });
    }

    await tx.catalogState.upsert({
      where: { id: 1 },
      update: {
        headersJson: JSON.stringify(["name", "price"]),
        mappingJson: JSON.stringify(DEFAULT_MAPPING),
        sourceFileName: sourceFileName || null,
      },
      create: {
        id: 1,
        headersJson: JSON.stringify(["name", "price"]),
        mappingJson: JSON.stringify(DEFAULT_MAPPING),
        sourceFileName: sourceFileName || null,
      },
    });
  });

  return getCatalog();
};

export const getCatalog = async () => {
  const [products, state] = await Promise.all([
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.catalogState.findUnique({ where: { id: 1 } }),
  ]);

  const headers = state
    ? parseJsonSafe(state.headersJson, ["name", "price"])
    : ["name", "price"];
  const mapping = state
    ? parseJsonSafe(state.mappingJson, DEFAULT_MAPPING)
    : DEFAULT_MAPPING;

  const items = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    details: "",
    type: "General",
    fields: {
      name: product.name,
      price: String(product.price),
    },
  }));

  return {
    items,
    headers,
    mapping,
    sourceFileName: state?.sourceFileName || "",
  };
};

export const updateCatalogField = async ({ itemId, header, value }) => {
  const productId = Number(itemId);
  const [product, state] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.catalogState.findUnique({ where: { id: 1 } }),
  ]);

  if (!product) {
    throw new Error("Product not found.");
  }

  const mapping = state
    ? parseJsonSafe(state.mappingJson, DEFAULT_MAPPING)
    : DEFAULT_MAPPING;
  const nextValue = String(value ?? "");
  const nextData = {};

  if (header === mapping.nameHeader) {
    nextData.name = nextValue.trim();
  }

  if (header === mapping.priceHeader) {
    nextData.price = parseNumber(nextValue);
  }

  await prisma.product.update({
    where: { id: productId },
    data: nextData,
  });

  return getCatalog();
};

export const clearCatalog = async () => {
  await prisma.$transaction(async (tx) => {
    await tx.product.deleteMany();
    await tx.catalogState.deleteMany();
  });
};

export const listProducts = async ({ search = "" } = {}) => {
  const where = search
    ? {
        name: {
          contains: search,
        },
      }
    : {};

  return prisma.product.findMany({
    where,
    orderBy: { id: "asc" },
  });
};
