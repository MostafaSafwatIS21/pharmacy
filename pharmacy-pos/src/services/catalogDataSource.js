const getDesktopBridge = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.pharmacyDb || null;
};

export const hasDesktopDbBridge = () => Boolean(getDesktopBridge());

export const saveImportedCatalog = async ({
  parsedResult,
  fileName,
  setImportedData,
}) => {
  const bridge = getDesktopBridge();

  if (bridge?.replaceCatalog && bridge?.getCatalog) {
    await bridge.replaceCatalog({
      ...parsedResult,
      sourceFileName: fileName,
    });

    const storedCatalog = await bridge.getCatalog();
    setImportedData(storedCatalog);
    return storedCatalog;
  }

  const localData = {
    ...parsedResult,
    sourceFileName: fileName,
  };
  setImportedData(localData);
  return localData;
};

export const loadCatalog = async ({ setImportedData }) => {
  const bridge = getDesktopBridge();

  if (bridge?.getCatalog) {
    const storedCatalog = await bridge.getCatalog();
    setImportedData(storedCatalog);
    return storedCatalog;
  }

  return null;
};

export const clearCatalogData = async ({ clearDatabase }) => {
  const bridge = getDesktopBridge();

  if (bridge?.clearCatalog) {
    await bridge.clearCatalog();
  }

  clearDatabase();
};

export const saveEditedField = async ({
  itemId,
  header,
  value,
  setImportedData,
  updateItemField,
}) => {
  const bridge = getDesktopBridge();

  if (bridge?.updateCatalogField && bridge?.getCatalog) {
    await bridge.updateCatalogField({ itemId, header, value });
    const storedCatalog = await bridge.getCatalog();
    setImportedData(storedCatalog);
    return;
  }

  updateItemField(itemId, header, value);
};

export const addProduct = async ({
  name,
  price,
  setImportedData,
  addLocalItem,
}) => {
  const bridge = getDesktopBridge();

  if (bridge?.addCatalogItem && bridge?.getCatalog) {
    await bridge.addCatalogItem({ name, price });
    const storedCatalog = await bridge.getCatalog();
    setImportedData(storedCatalog);
    return;
  }

  addLocalItem({ name, price });
};

export const deleteProducts = async ({
  itemIds,
  setImportedData,
  removeLocalItems,
}) => {
  const bridge = getDesktopBridge();

  if (bridge?.deleteCatalogItems && bridge?.getCatalog) {
    await bridge.deleteCatalogItems({ ids: itemIds });
    const storedCatalog = await bridge.getCatalog();
    setImportedData(storedCatalog);
    return;
  }

  removeLocalItems(itemIds);
};
