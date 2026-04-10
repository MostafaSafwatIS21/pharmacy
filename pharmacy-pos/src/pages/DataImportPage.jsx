import { Database, FileUp, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearCatalogData,
  hasDesktopDbBridge,
  loadCatalog,
  saveImportedCatalog,
} from "../services/catalogDataSource";
import { useCatalogStore } from "../store/useCatalogStore";
import { parseImportFile } from "../utils/importParsers";

const DEFAULT_MAPPING = {
  nameHeader: "name",
  priceHeader: "price",
  detailsHeader: null,
  typeHeader: null,
};

const toPriceNumber = (value) => {
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const mergeItemsByName = (existingItems, importedItems) => {
  const byName = new Map();

  existingItems.forEach((item, index) => {
    const name = String(item?.name || "").trim();
    if (!name) {
      return;
    }

    const price = toPriceNumber(item?.price);
    const existingFields = {
      ...(item?.fields || {}),
      name,
      price: String(price),
    };
    byName.set(name.toLowerCase(), {
      id: item?.id ?? `existing-${index}-${name.toLowerCase()}`,
      name,
      price,
      details: item?.details || existingFields.details || "",
      type: item?.type || existingFields.type || "General",
      fields: existingFields,
    });
  });

  importedItems.forEach((item, index) => {
    const name = String(item?.name || "").trim();
    if (!name) {
      return;
    }

    const price = toPriceNumber(item?.price);
    const importedFields = {
      ...(item?.fields || {}),
      name,
      price: String(price),
    };
    byName.set(name.toLowerCase(), {
      id: item?.id ?? `imported-${index}-${name.toLowerCase()}`,
      name,
      price,
      details: item?.details || importedFields.details || "",
      type: item?.type || importedFields.type || "General",
      fields: importedFields,
    });
  });

  return Array.from(byName.values());
};

function DataImportPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const setImportedData = useCatalogStore((state) => state.setImportedData);
  const clearDatabase = useCatalogStore((state) => state.clearDatabase);
  const existingItems = useCatalogStore((state) => state.items);
  const itemsCount = useCatalogStore((state) => state.items.length);
  const sourceFileName = useCatalogStore((state) => state.sourceFileName);

  useEffect(() => {
    loadCatalog({ setImportedData }).catch(() => {
      setMessage("Failed to load desktop database catalog.");
    });
  }, [setImportedData]);

  const importFiles = async (files) => {
    const fileList = Array.from(files || []).filter(Boolean);

    if (fileList.length === 0) {
      return;
    }

    setMessage("");
    setIsLoading(true);

    try {
      const importedItems = [];
      const importedFileNames = [];
      const mergedHeaders = new Set(["name", "price"]);
      let skippedFiles = 0;
      let nextMapping = DEFAULT_MAPPING;

      for (const file of fileList) {
        try {
          const parsedResult = await parseImportFile(file);

          if (parsedResult.items.length === 0) {
            skippedFiles += 1;
            continue;
          }

          importedItems.push(...parsedResult.items);
          importedFileNames.push(file.name);
          (parsedResult.headers || []).forEach((header) =>
            mergedHeaders.add(header),
          );

          nextMapping = {
            ...nextMapping,
            ...(parsedResult.mapping || {}),
          };
        } catch {
          skippedFiles += 1;
        }
      }

      if (importedItems.length === 0) {
        setMessage("No valid rows found. Check Name and Price columns.");
        return;
      }

      const mergedItems = mergeItemsByName(existingItems, importedItems);
      const mergedCatalog = {
        items: mergedItems,
        headers: Array.from(mergedHeaders),
        mapping: nextMapping,
      };

      await saveImportedCatalog({
        parsedResult: mergedCatalog,
        fileName: importedFileNames.join(", "),
        setImportedData,
      });

      setMessage(
        `Imported ${importedItems.length} items from ${importedFileNames.length} file(s). Total records: ${mergedItems.length}.${
          skippedFiles > 0 ? ` Skipped ${skippedFiles} invalid file(s).` : ""
        }`,
      );
      setTimeout(() => navigate("/items"), 500);
    } catch (error) {
      setMessage(error.message || "Failed to parse file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragActive(false);

    importFiles(event.dataTransfer.files);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-slate-900">Data Import</h2>
        <p className="mt-1 text-slate-600">
          Upload one or multiple Excel/CSV files to append items into your
          directory.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={() => setIsDragActive(true)}
        onDragLeave={() => setIsDragActive(false)}
        onKeyDown={(event) =>
          event.key === "Enter" && fileInputRef.current?.click()
        }
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          isDragActive
            ? "border-emerald-600 bg-emerald-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-500"
        }`}
      >
        <UploadCloud className="mx-auto mb-4 text-slate-700" size={44} />
        <p className="text-lg font-semibold text-slate-900">
          Drop your file(s) here or click to upload
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Supported formats: .xlsx, .xls, .csv (single or multiple files)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".xlsx,.xls,.csv"
        onChange={(event) => importFiles(event.target.files)}
      />

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <FileUp size={18} className="text-slate-500" />
          <span className="font-medium">Required columns:</span>
          <span>Name and Price (extra columns are optional)</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-slate-500" />
            <span>
              Database status: {itemsCount} records
              {sourceFileName ? ` (from ${sourceFileName})` : ""}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {hasDesktopDbBridge() ? "Desktop DB" : "Local fallback"}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await clearCatalogData({ clearDatabase });
              setMessage("Database cleared. You can import a new file.");
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700"
          >
            <Trash2 size={14} />
            Delete Current Data
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm font-semibold text-sky-700">
          Importing and merging your file(s)...
        </p>
      )}
      {message && (
        <p className="text-sm font-semibold text-slate-800">{message}</p>
      )}
    </section>
  );
}

export default DataImportPage;
