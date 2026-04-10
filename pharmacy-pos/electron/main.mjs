import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

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
  const { ensureDesktopSchema } =
    await import("../desktop-db/prismaClient.mjs");

  await ensureDesktopSchema();

  dbApi = {
    productDb,
    customerDb,
    invoiceDb,
  };

  return dbApi;
};

const registerIpcHandlers = async () => {
  const { productDb, customerDb, invoiceDb } = await loadDbApi();

  ipcMain.handle("catalog:replace", async (_event, payload) =>
    productDb.replaceCatalog(payload),
  );
  ipcMain.handle("catalog:get", async () => productDb.getCatalog());
  ipcMain.handle("catalog:clear", async () => productDb.clearCatalog());
  ipcMain.handle("catalog:updateField", async (_event, payload) =>
    productDb.updateCatalogField(payload),
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

app.whenReady().then(async () => {
  await registerIpcHandlers();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
