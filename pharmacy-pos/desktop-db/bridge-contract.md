Desktop bridge contract (no API)

Expose these methods to renderer as window.pharmacyDb:

1. replaceCatalog(payload)

- payload shape:
  {
  items: Array<{ id: string, name: string, price: number, fields: Record<string, string> }>,
  headers: string[],
  mapping: {
  nameHeader: string,
  priceHeader: string,
  detailsHeader: string | null,
  typeHeader: string | null
  },
  sourceFileName: string
  }

2. getCatalog()

- returns same shape as payload above

3. clearCatalog()

- clears products and catalog metadata

4. updateCatalogField({ itemId, header, value })

- updates one field in Product.fieldsJson and syncs name/price columns

Implementation source functions are in:

- desktop-db/productDb.mjs

Suggested Electron flow:

- Main process imports desktop-db/productDb.mjs
- Register ipcMain.handle handlers
- Preload exposes window.pharmacyDb via contextBridge
