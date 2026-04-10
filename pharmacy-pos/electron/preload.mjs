import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pharmacyDb", {
  replaceCatalog: (payload) => ipcRenderer.invoke("catalog:replace", payload),
  getCatalog: () => ipcRenderer.invoke("catalog:get"),
  clearCatalog: () => ipcRenderer.invoke("catalog:clear"),
  updateCatalogField: (payload) =>
    ipcRenderer.invoke("catalog:updateField", payload),

  addCustomer: (payload) => ipcRenderer.invoke("customer:add", payload),
  listCustomers: (payload) => ipcRenderer.invoke("customer:list", payload),

  saveInvoice: (payload) => ipcRenderer.invoke("invoice:save", payload),
  listInvoices: (payload) => ipcRenderer.invoke("invoice:list", payload),
});
