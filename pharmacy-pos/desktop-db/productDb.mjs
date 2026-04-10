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
      data: normalizedProducts.map((product) => ({
        ...product,
        fieldsJson: JSON.stringify({
          name: product.name,
          price: String(product.price),
        }),
      })),
    });
  }

  return prisma.product.findMany({ orderBy: { id: "asc" } });
};

export const replaceCatalog = async ({
  items,
  headers,
  mapping,
  sourceFileName,
}) => {
  const validItems = (items || [])
    .map((item) => {
      const name = String(item?.name || "").trim();
      const price = parseNumber(
        item?.price ?? item?.fields?.[mapping?.priceHeader || "price"],
      );

      if (!name) {
        return null;
      }

      const fields = item?.fields || {
        [mapping?.nameHeader || "name"]: name,
        [mapping?.priceHeader || "price"]: String(price),
      };

      return {
        externalId: String(item?.id || crypto.randomUUID()),
        name,
        price,
        fieldsJson: JSON.stringify(fields),
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
        headersJson: JSON.stringify(headers || []),
        mappingJson: JSON.stringify(mapping || DEFAULT_MAPPING),
        sourceFileName: sourceFileName || null,
      },
      create: {
        id: 1,
        headersJson: JSON.stringify(headers || []),
        mappingJson: JSON.stringify(mapping || DEFAULT_MAPPING),
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

  const headers = state ? parseJsonSafe(state.headersJson, []) : [];
  const mapping = state
    ? parseJsonSafe(state.mappingJson, DEFAULT_MAPPING)
    : DEFAULT_MAPPING;

  const items = products.map((product) => {
    const fields = parseJsonSafe(product.fieldsJson, {});
    return {
      id: product.externalId,
      name: product.name,
      price: product.price,
      details: mapping.detailsHeader ? fields[mapping.detailsHeader] || "" : "",
      type: mapping.typeHeader
        ? fields[mapping.typeHeader] || "General"
        : "General",
      fields,
    };
  });

  return {
    items,
    headers,
    mapping,
    sourceFileName: state?.sourceFileName || "",
  };
};

export const updateCatalogField = async ({ itemId, header, value }) => {
  const [product, state] = await Promise.all([
    prisma.product.findUnique({ where: { externalId: itemId } }),
    prisma.catalogState.findUnique({ where: { id: 1 } }),
  ]);

  if (!product) {
    throw new Error("Product not found.");
  }

  const mapping = state
    ? parseJsonSafe(state.mappingJson, DEFAULT_MAPPING)
    : DEFAULT_MAPPING;
  const fields = parseJsonSafe(product.fieldsJson, {});
  const nextValue = String(value ?? "");
  fields[header] = nextValue;

  const nextData = {
    fieldsJson: JSON.stringify(fields),
  };

  if (header === mapping.nameHeader) {
    nextData.name = nextValue.trim();
  }

  if (header === mapping.priceHeader) {
    nextData.price = parseNumber(nextValue);
  }

  await prisma.product.update({
    where: { externalId: itemId },
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
