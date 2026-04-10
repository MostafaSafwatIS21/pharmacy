import fs from "node:fs/promises";
import { addCustomer, listCustomers } from "../desktop-db/customerDb.mjs";
import { listInvoices, saveInvoice } from "../desktop-db/invoiceDb.mjs";
import {
  clearCatalog,
  getCatalog,
  listProducts,
  replaceCatalog,
  replaceProducts,
  updateCatalogField,
} from "../desktop-db/productDb.mjs";

const print = (value) => {
  console.log(JSON.stringify(value, null, 2));
};

const command = process.argv[2];

const run = async () => {
  switch (command) {
    case "import-products-json": {
      const filePath = process.argv[3];
      if (!filePath) {
        throw new Error("Usage: db:cli import-products-json <filePath>");
      }
      const fileText = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(fileText);
      const rows = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(rows)) {
        throw new Error("JSON must be an array or have an items array.");
      }
      const saved = await replaceProducts(rows);
      print({
        message: "Products replaced",
        count: saved.length,
        products: saved,
      });
      return;
    }

    case "list-products": {
      const search = process.argv[3] || "";
      const rows = await listProducts({ search });
      print(rows);
      return;
    }

    case "import-catalog-json": {
      const filePath = process.argv[3];
      if (!filePath) {
        throw new Error("Usage: db:cli import-catalog-json <filePath>");
      }
      const fileText = await fs.readFile(filePath, "utf8");
      const payload = JSON.parse(fileText);
      const result = await replaceCatalog(payload);
      print({
        message: "Catalog replaced",
        count: result.items.length,
        ...result,
      });
      return;
    }

    case "get-catalog": {
      const result = await getCatalog();
      print(result);
      return;
    }

    case "update-catalog-field": {
      const itemId = process.argv[3];
      const header = process.argv[4];
      const value = process.argv[5];

      if (!itemId || !header) {
        throw new Error(
          "Usage: db:cli update-catalog-field <itemId> <header> <value>",
        );
      }

      const result = await updateCatalogField({ itemId, header, value });
      print(result);
      return;
    }

    case "clear-catalog": {
      await clearCatalog();
      print({ message: "Catalog cleared" });
      return;
    }

    case "add-customer": {
      const name = process.argv[3];
      const location = process.argv[4];
      const phoneNumber = process.argv[5];
      const created = await addCustomer({ name, location, phoneNumber });
      print(created);
      return;
    }

    case "list-customers": {
      const search = process.argv[3] || "";
      const rows = await listCustomers({ search });
      print(rows);
      return;
    }

    case "save-invoice": {
      const productName = process.argv[3];
      const price = process.argv[4];
      const qty = process.argv[5];
      const customerName = process.argv[6];
      const created = await saveInvoice({
        productName,
        price,
        qty,
        customerName,
      });
      print(created);
      return;
    }

    case "list-invoices": {
      const search = process.argv[3] || "";
      const customerName = process.argv[4] || "";
      const rows = await listInvoices({ search, customerName });
      print(rows);
      return;
    }

    default:
      throw new Error(
        "Commands: import-products-json | list-products | import-catalog-json | get-catalog | update-catalog-field | clear-catalog | add-customer | list-customers | save-invoice | list-invoices",
      );
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
