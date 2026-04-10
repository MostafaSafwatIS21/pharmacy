import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { addCustomer, listCustomers } from "../desktop-db/customerDb.mjs";
import { listInvoices, saveInvoice } from "../desktop-db/invoiceDb.mjs";
import {
  clearCatalog,
  getCatalog,
  replaceCatalog,
  updateCatalogField,
} from "../desktop-db/productDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

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

ipcMain.handle("catalog:replace", async (_event, payload) =>
  replaceCatalog(payload),
);
ipcMain.handle("catalog:get", async () => getCatalog());
ipcMain.handle("catalog:clear", async () => clearCatalog());
ipcMain.handle("catalog:updateField", async (_event, payload) =>
  updateCatalogField(payload),
);

ipcMain.handle("customer:add", async (_event, payload) => addCustomer(payload));
ipcMain.handle("customer:list", async (_event, payload) =>
  listCustomers(payload || {}),
);

ipcMain.handle("invoice:save", async (_event, payload) => saveInvoice(payload));
ipcMain.handle("invoice:list", async (_event, payload) =>
  listInvoices(payload || {}),
);

app.whenReady().then(async () => {
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
