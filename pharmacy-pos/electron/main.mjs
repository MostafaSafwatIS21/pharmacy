import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

// Reduce native startup crashes on some Windows GPUs/drivers.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");

let dbApi;

const loadDbApi = async () => {
  if (dbApi) {
    return dbApi;
  }

  const prismaFolder = path.join(app.getPath("userData"), "prisma");
  mkdirSync(prismaFolder, { recursive: true });

  const dbFilePath = path.join(prismaFolder, "pharmacy.db");
  process.env.PHARMACY_DB_URL = `file:${dbFilePath.replace(/\\/g, "/")}`;

  const productDb = await import("../desktop-db/productDb.mjs");
  const customerDb = await import("../desktop-db/customerDb.mjs");
  const invoiceDb = await import("../desktop-db/invoiceDb.mjs");
  const quotationDb = await import("../desktop-db/quotationDb.mjs");
  const { ensureDesktopSchema } =
    await import("../desktop-db/prismaClient.mjs");

  await ensureDesktopSchema();

  dbApi = {
    productDb,
    customerDb,
    invoiceDb,
    quotationDb,
  };

  return dbApi;
};

const registerIpcHandlers = async () => {
  const { productDb, customerDb, invoiceDb, quotationDb } = await loadDbApi();

  ipcMain.handle("catalog:replace", async (_event, payload) =>
    productDb.replaceCatalog(payload),
  );
  ipcMain.handle("catalog:get", async () => productDb.getCatalog());
  ipcMain.handle("catalog:clear", async () => productDb.clearCatalog());
  ipcMain.handle("catalog:updateField", async (_event, payload) =>
    productDb.updateCatalogField(payload),
  );
  ipcMain.handle("catalog:addItem", async (_event, payload) =>
    productDb.addCatalogItem(payload),
  );
  ipcMain.handle("catalog:deleteItems", async (_event, payload) =>
    productDb.deleteCatalogItems(payload || {}),
  );

  ipcMain.handle("customer:add", async (_event, payload) =>
    customerDb.addCustomer(payload),
  );
  ipcMain.handle("customer:list", async (_event, payload) =>
    customerDb.listCustomers(payload || {}),
  );
  ipcMain.handle("customer:update", async (_event, payload) =>
    customerDb.updateCustomer(payload),
  );
  ipcMain.handle("customer:delete", async (_event, payload) =>
    customerDb.deleteCustomer(payload),
  );

  ipcMain.handle("invoice:save", async (_event, payload) =>
    invoiceDb.saveInvoice(payload),
  );
  ipcMain.handle("invoice:list", async (_event, payload) =>
    invoiceDb.listInvoices(payload || {}),
  );
  ipcMain.handle("invoice:nextNumber", async () =>
    invoiceDb.getNextInvoiceNumber(),
  );
  ipcMain.handle("invoice:delete", async (_event, payload) =>
    invoiceDb.deleteInvoice(payload || {}),
  );

  ipcMain.handle("quotation:nextNumber", async () =>
    quotationDb.getNextQuoteNumber(),
  );
  ipcMain.handle("quotation:save", async (_event, payload) =>
    quotationDb.saveQuotation(payload || {}),
  );
  ipcMain.handle("quotation:list", async (_event, payload) =>
    quotationDb.listQuotations(payload || {}),
  );
  ipcMain.handle("quotation:approve", async (_event, payload) =>
    quotationDb.approveQuotation(payload || {}),
  );
  ipcMain.handle("quotation:delete", async (_event, payload) =>
    quotationDb.deleteQuotation(payload || {}),
  );
  ipcMain.handle("quotation:deleteByInvoice", async (_event, payload) =>
    quotationDb.deleteQuotationByInvoiceNumber(payload || {}),
  );
};

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(
      path.join(app.getAppPath(), "dist", "index.html"),
    );
  }
};

app
  .whenReady()
  .then(async () => {
    await registerIpcHandlers();
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    const message = String(
      error?.stack || error?.message || error || "Unknown startup error",
    );
    dialog.showErrorBox("Pharmacy POS Startup Error", message);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
