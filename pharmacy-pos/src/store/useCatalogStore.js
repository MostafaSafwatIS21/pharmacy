import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_PERSISTED_ITEMS = 2000;

const parseNumericPrice = (value) => {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const useCatalogStore = create(
  persist(
    (set) => ({
      items: [],
      headers: [],
      mapping: {
        nameHeader: "name",
        priceHeader: "price",
        detailsHeader: null,
        typeHeader: null,
      },
      sourceFileName: "",
      selectedItemIds: [],
      setImportedData: ({ items, headers, mapping, sourceFileName }) =>
        set({
          items,
          headers,
          mapping,
          sourceFileName,
          selectedItemIds: [],
        }),
      clearDatabase: () =>
        set({
          items: [],
          headers: [],
          mapping: {
            nameHeader: "name",
            priceHeader: "price",
            detailsHeader: null,
            typeHeader: null,
          },
          sourceFileName: "",
          selectedItemIds: [],
        }),
      updateItemField: (itemId, header, value) =>
        set((state) => {
          const { mapping } = state;

          return {
            items: state.items.map((item) => {
              if (item.id !== itemId) {
                return item;
              }

              const nextValue = String(value ?? "");
              const nextFields = {
                ...(item.fields || {}),
                [header]: nextValue,
              };

              const nextItem = {
                ...item,
                fields: nextFields,
              };

              if (header === mapping.nameHeader) {
                nextItem.name = nextValue.trim();
              }

              if (header === mapping.priceHeader) {
                nextItem.price = parseNumericPrice(nextValue);
              }

              if (mapping.detailsHeader && header === mapping.detailsHeader) {
                nextItem.details = nextValue.trim();
              }

              if (mapping.typeHeader && header === mapping.typeHeader) {
                nextItem.type = nextValue.trim() || "General";
              }

              return nextItem;
            }),
          };
        }),
      toggleSelection: (itemId) =>
        set((state) => {
          const isSelected = state.selectedItemIds.includes(itemId);
          return {
            selectedItemIds: isSelected
              ? state.selectedItemIds.filter((id) => id !== itemId)
              : [...state.selectedItemIds, itemId],
          };
        }),
      setSelection: (itemIds) =>
        set({
          selectedItemIds: itemIds,
        }),
      clearSelection: () =>
        set({
          selectedItemIds: [],
        }),
      addItem: ({ name, price }) =>
        set((state) => {
          const normalizedName = String(name || "").trim();
          const normalizedPrice = parseNumericPrice(price);

          if (!normalizedName) {
            return state;
          }

          const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const nextItem = {
            id,
            name: normalizedName,
            price: normalizedPrice,
            details: "",
            type: "General",
            fields: {
              name: normalizedName,
              price: String(normalizedPrice),
            },
          };

          return {
            items: [...state.items, nextItem],
          };
        }),
      removeItems: (itemIds) =>
        set((state) => {
          const idSet = new Set(itemIds || []);
          return {
            items: state.items.filter((item) => !idSet.has(item.id)),
            selectedItemIds: state.selectedItemIds.filter(
              (id) => !idSet.has(id),
            ),
          };
        }),
    }),
    {
      name: "pharmacy-pos-db-v1",
      partialize: (state) => ({
        items: state.items.length <= MAX_PERSISTED_ITEMS ? state.items : [],
        headers: state.headers,
        mapping: state.mapping,
        sourceFileName:
          state.items.length <= MAX_PERSISTED_ITEMS ? state.sourceFileName : "",
      }),
    },
  ),
);
