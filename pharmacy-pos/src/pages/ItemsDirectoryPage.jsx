import { Search, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadCatalog, saveEditedField } from "../services/catalogDataSource";
import { useCatalogStore } from "../store/useCatalogStore";

function ItemsDirectoryPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const items = useCatalogStore((state) => state.items);
  const headers = useCatalogStore((state) => state.headers);
  const mapping = useCatalogStore((state) => state.mapping);
  const selectedItemIds = useCatalogStore((state) => state.selectedItemIds);
  const toggleSelection = useCatalogStore((state) => state.toggleSelection);
  const clearSelection = useCatalogStore((state) => state.clearSelection);
  const setSelection = useCatalogStore((state) => state.setSelection);
  const updateItemField = useCatalogStore((state) => state.updateItemField);
  const setImportedData = useCatalogStore((state) => state.setImportedData);

  useEffect(() => {
    loadCatalog({ setImportedData }).catch(() => {
      // Keep current state if desktop bridge is unavailable.
    });
  }, [setImportedData]);

  const deferredQuery = useDeferredValue(query);
  const selectedIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  );

  const typeOptions = useMemo(() => {
    const unique = new Set(items.map((item) => item.type || "General"));
    return ["all", ...Array.from(unique)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const searchableText = [
        item.name,
        item.type,
        item.details,
        item.fields?.[mapping.nameHeader],
        item.fields?.[mapping.priceHeader],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = searchableText.includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [
    deferredQuery,
    items,
    mapping.nameHeader,
    mapping.priceHeader,
    typeFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredQuery, typeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, pageSize, safePage]);

  const visibleHeaders = headers.length > 0 ? headers : ["name", "price"];

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIdSet.has(item.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleItems.map((item) => item.id));
      const nextSelection = selectedItemIds.filter((id) => !visibleIds.has(id));
      setSelection(nextSelection);
      return;
    }

    const union = new Set([
      ...selectedItemIds,
      ...visibleItems.map((item) => item.id),
    ]);
    setSelection(Array.from(union));
  };

  const commitCellEdit = (itemId, header, value) => {
    saveEditedField({
      itemId,
      header,
      value,
      setImportedData,
      updateItemField,
    }).catch(() => {
      updateItemField(itemId, header, value);
    });
  };

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h2 className="font-display text-2xl text-slate-900">
          Items Directory
        </h2>
        <p className="mt-2 text-slate-700">No imported items found yet.</p>
        <Link
          to="/import"
          className="mt-5 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Go to Data Import
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-slate-900">
            Items Directory
          </h2>
          <p className="mt-1 text-slate-600">
            Search, filter, and select items for quotation or POS invoice.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/quotation"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Build Quotation
          </Link>
          <Link
            to="/pos"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Start POS Sale
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, details, type, or price"
            className="w-full border-none bg-transparent text-sm text-slate-800 outline-none"
          />
        </label>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
        >
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All types" : type}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={toggleSelectAllVisible}
          className="rounded-xl border border-slate-900 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          {allVisibleSelected ? "Unselect Page" : "Select Page"}
        </button>

        <button
          type="button"
          onClick={clearSelection}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
        >
          <Trash2 size={14} />
          Clear
        </button>

        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
        >
          <option value={100}>100 / page</option>
          <option value={250}>250 / page</option>
          <option value={500}>500 / page</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-125 overflow-auto">
          <table className="w-full min-w-245 border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr className="text-slate-700">
                <th className="px-4 py-3">Select</th>
                {visibleHeaders.map((header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isSelected = selectedIdSet.has(item.id);

                return (
                  <tr
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                      isSelected ? "bg-emerald-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    {visibleHeaders.map((header) => {
                      const isPriceColumn = header === mapping.priceHeader;
                      const value = item.fields?.[header] ?? "";

                      return (
                        <td key={`${item.id}-${header}`} className="px-4 py-2">
                          <input
                            defaultValue={value}
                            type={isPriceColumn ? "text" : "text"}
                            onClick={(event) => event.stopPropagation()}
                            onBlur={(event) =>
                              commitCellEdit(
                                item.id,
                                header,
                                event.target.value,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 outline-none focus:border-slate-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        Showing page {safePage} / {totalPages} ({visibleItems.length} rows) out
        of {filteredItems.length} filtered, {items.length} total. Selected:{" "}
        {selectedItemIds.length}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={safePage === 1}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={safePage === totalPages}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default ItemsDirectoryPage;
