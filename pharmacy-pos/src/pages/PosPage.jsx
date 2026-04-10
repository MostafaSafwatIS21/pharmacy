import { Printer, ReceiptText } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import { useCatalogStore } from "../store/useCatalogStore";

const formatCurrency = (value) => `$${value.toFixed(2)}`;

function PosPage() {
  const items = useCatalogStore((state) => state.items);
  const selectedItemIds = useCatalogStore((state) => state.selectedItemIds);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [cashierName, setCashierName] = useState("Main Cashier");
  const [taxRate, setTaxRate] = useState(14);
  const [showDetails, setShowDetails] = useState(true);
  const [showType, setShowType] = useState(true);
  const [showQuantity, setShowQuantity] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showPriceAfterTax, setShowPriceAfterTax] = useState(true);
  const [quantityById, setQuantityById] = useState({});
  const [selectedRowId, setSelectedRowId] = useState("");
  const invoiceRef = useRef(null);

  const selectedItems = items.filter((item) =>
    selectedItemIds.includes(item.id),
  );
  const safeTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));

  const lineItems = useMemo(
    () =>
      selectedItems.map((item) => {
        const quantity = Math.max(1, Number(quantityById[item.id] || 1));
        const lineTotal = item.price * quantity;
        const lineTax = lineTotal * (safeTaxRate / 100);
        return {
          ...item,
          quantity,
          lineTotal,
          lineTax,
          totalAfterTax: lineTotal + lineTax,
        };
      }),
    [quantityById, selectedItems, safeTaxRate],
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * (safeTaxRate / 100);
  const grandTotal = subtotal + tax;

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: "pos-invoice",
  });

  const handleRowSelect = (rowId) => {
    setSelectedRowId((current) => (current === rowId ? "" : rowId));
  };

  const selectedRowName =
    lineItems.find((item) => item.id === selectedRowId)?.name || "None";

  const today = new Date();

  if (selectedItems.length === 0) {
    return (
      <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-display text-2xl text-slate-900">
          POS & Sales Invoice
        </h2>
        <p className="text-slate-700">
          No selected items yet. Please choose items from Items Directory first.
        </p>
        <Link
          to="/items"
          className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Items Directory
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="screen-only rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-slate-900">
              POS & Sales Invoice
            </h2>
            <p className="mt-1 text-slate-600">
              All selected items and details are ready in print layout B.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Printer size={16} />
              Print Invoice
            </button>
            <Link
              to="/items"
              className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Items Directory
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Customer Name</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Cashier Name</span>
            <input
              value={cashierName}
              onChange={(event) => setCashierName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Tax Rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2 rounded-xl border border-slate-300 p-3 text-sm sm:grid-cols-3">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(event) => setShowDetails(event.target.checked)}
              className="h-4 w-4"
            />
            Details
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showType}
              onChange={(event) => setShowType(event.target.checked)}
              className="h-4 w-4"
            />
            Type
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showQuantity}
              onChange={(event) => setShowQuantity(event.target.checked)}
              className="h-4 w-4"
            />
            Quantity
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showLineTotal}
              onChange={(event) => setShowLineTotal(event.target.checked)}
              className="h-4 w-4"
            />
            Line total
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showPriceAfterTax}
              onChange={(event) => setShowPriceAfterTax(event.target.checked)}
              className="h-4 w-4"
            />
            Price after tax
          </label>
        </div>
      </div>

      <div className="screen-only overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="px-4 py-3">Item</th>
                {showDetails && <th className="px-4 py-3">Details</th>}
                {showType && <th className="px-4 py-3">Type</th>}
                <th className="px-4 py-3">Unit Price</th>
                {showQuantity && <th className="px-4 py-3">Qty</th>}
                {showLineTotal && <th className="px-4 py-3">Line Total</th>}
                {showPriceAfterTax && (
                  <th className="px-4 py-3">Total After Tax</th>
                )}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowSelect(item.id)}
                  className={`cursor-pointer border-t border-slate-100 ${
                    selectedRowId === item.id
                      ? "bg-emerald-100 ring-1 ring-emerald-500"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {item.name}
                  </td>
                  {showDetails && (
                    <td className="px-4 py-3 text-slate-700">
                      {item.details || "-"}
                    </td>
                  )}
                  {showType && (
                    <td className="px-4 py-3 text-slate-700">{item.type}</td>
                  )}
                  <td className="px-4 py-3 text-slate-700">
                    {formatCurrency(item.price)}
                  </td>
                  {showQuantity && (
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          setQuantityById((current) => ({
                            ...current,
                            [item.id]: Math.max(
                              1,
                              Number(event.target.value || 1),
                            ),
                          }))
                        }
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 outline-none focus:border-slate-700"
                      />
                    </td>
                  )}
                  {showLineTotal && (
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  )}
                  {showPriceAfterTax && (
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(item.totalAfterTax)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="screen-only rounded-2xl border border-slate-200 bg-white p-5">
        <div className="ml-auto max-w-sm space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-700">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-700">
            <span>Tax ({safeTaxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-700">
          Selected row: {selectedRowName}
        </p>
      </div>

      <article
        ref={invoiceRef}
        className="a4-sheet rounded-2xl border border-slate-300 bg-white p-6 print:border-none print:p-0"
      >
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display text-2xl text-slate-900">
              Pharmacy POS Invoice
            </h3>
            <p className="text-sm text-slate-600">Print Layout B</p>
          </div>
          <ReceiptText size={32} className="text-slate-400" />
        </div>

        <div className="mb-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Date:</span>{" "}
            {today.toLocaleDateString()}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Time:</span>{" "}
            {today.toLocaleTimeString()}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Customer:</span>{" "}
            {customerName || "Walk-in Customer"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Cashier:</span>{" "}
            {cashierName || "Main Cashier"}
          </p>
        </div>

        <table className="mb-4 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-slate-700">
              <th className="px-2 py-2">Item</th>
              {showDetails && <th className="px-2 py-2">Details</th>}
              {showType && <th className="px-2 py-2">Type</th>}
              <th className="px-2 py-2">Unit</th>
              {showQuantity && <th className="px-2 py-2">Qty</th>}
              {showLineTotal && <th className="px-2 py-2">Total</th>}
              {showPriceAfterTax && (
                <th className="px-2 py-2">Total After Tax</th>
              )}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr
                key={item.id}
                onClick={() => handleRowSelect(item.id)}
                className={`cursor-pointer border-b border-slate-200 ${
                  selectedRowId === item.id
                    ? "bg-emerald-100 ring-1 ring-emerald-500"
                    : ""
                }`}
              >
                <td className="px-2 py-2 font-semibold text-slate-900">
                  {item.name}
                </td>
                {showDetails && (
                  <td className="px-2 py-2 text-slate-700">
                    {item.details || "-"}
                  </td>
                )}
                {showType && (
                  <td className="px-2 py-2 text-slate-700">{item.type}</td>
                )}
                <td className="px-2 py-2 text-slate-700">
                  {formatCurrency(item.price)}
                </td>
                {showQuantity && (
                  <td className="px-2 py-2 text-slate-700">{item.quantity}</td>
                )}
                {showLineTotal && (
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(item.lineTotal)}
                  </td>
                )}
                {showPriceAfterTax && (
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(item.totalAfterTax)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <p className="flex justify-between text-slate-700">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between text-slate-700">
            <span>Tax ({safeTaxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </p>
          <p className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </p>
        </div>
      </article>
    </section>
  );
}

export default PosPage;
