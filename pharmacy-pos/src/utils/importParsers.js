const FIELD_ALIASES = {
  name: ["name", "item", "item name", "product", "drug", "medicine"],
  details: ["details", "description", "desc", "notes"],
  price: ["price", "unit price", "cost", "selling price", "amount"],
  type: ["type", "category", "class", "group"],
};

const normalizeKey = (value = "") => String(value).trim().toLowerCase();

const findHeaderByAliases = (headers, aliases) =>
  headers.find((header) => aliases.includes(normalizeKey(header)));

const toNumber = (value) => {
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeRows = (rows) => {
  const firstRow = rows[0] || {};
  const headers = Object.keys(firstRow);

  const nameHeader = findHeaderByAliases(headers, FIELD_ALIASES.name);
  const priceHeader = findHeaderByAliases(headers, FIELD_ALIASES.price);
  const detailsHeader = findHeaderByAliases(headers, FIELD_ALIASES.details);
  const typeHeader = findHeaderByAliases(headers, FIELD_ALIASES.type);

  if (!nameHeader || !priceHeader) {
    throw new Error(
      "Missing required columns. File must contain Name and Price headers.",
    );
  }

  const items = rows
    .map((row, index) => {
      const fields = {};
      headers.forEach((header) => {
        fields[header] = String(row[header] ?? "").trim();
      });

      const name = fields[nameHeader];
      if (!name) {
        return null;
      }

      const price = toNumber(fields[priceHeader]);

      return {
        id: `item-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        price,
        details: detailsHeader ? fields[detailsHeader] : "",
        type: typeHeader ? fields[typeHeader] || "General" : "General",
        fields,
      };
    })
    .filter(Boolean);

  return {
    items,
    headers,
    mapping: {
      nameHeader,
      priceHeader,
      detailsHeader,
      typeHeader,
    },
  };
};

const parseCsvFile = (file) =>
  new Promise((resolve, reject) => {
    import("papaparse")
      .then(({ default: Papa }) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(results.errors[0].message));
              return;
            }

            resolve(normalizeRows(results.data));
          },
          error: (error) => reject(error),
        });
      })
      .catch(reject);
  });

const parseExcelFile = async (file) => {
  const XLSX = await import("xlsx");
  const content = await file.arrayBuffer();
  const workbook = XLSX.read(content);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return normalizeRows(rows);
};

export const parseImportFile = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCsvFile(file);
  }

  if (extension === "xls" || extension === "xlsx") {
    return parseExcelFile(file);
  }

  throw new Error(
    "Unsupported file format. Please use .csv, .xls, or .xlsx files.",
  );
};
