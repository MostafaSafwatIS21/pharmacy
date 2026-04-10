import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pharmacyDb", {
  replaceCatalog: (payload) => ipcRenderer.invoke("catalog:replace", payload),
  getCatalog: () => ipcRenderer.invoke("catalog:get"),
  clearCatalog: () => ipcRenderer.invoke("catalog:clear"),
  updateCatalogField: (payload) =>
    ipcRenderer.invoke("catalog:updateField", payload),
  addCatalogItem: (payload) => ipcRenderer.invoke("catalog:addItem", payload),
  deleteCatalogItems: (payload) =>
    ipcRenderer.invoke("catalog:deleteItems", payload),

  addCustomer: (payload) => ipcRenderer.invoke("customer:add", payload),
  listCustomers: (payload) => ipcRenderer.invoke("customer:list", payload),
  updateCustomer: (payload) => ipcRenderer.invoke("customer:update", payload),
  deleteCustomer: (payload) => ipcRenderer.invoke("customer:delete", payload),

  saveInvoice: (payload) => ipcRenderer.invoke("invoice:save", payload),
  listInvoices: (payload) => ipcRenderer.invoke("invoice:list", payload),
  deleteInvoice: (payload) => ipcRenderer.invoke("invoice:delete", payload),
});
