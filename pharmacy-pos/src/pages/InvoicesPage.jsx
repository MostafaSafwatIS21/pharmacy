import { Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { listInvoiceLines } from "../services/invoiceDataSource";

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    listInvoiceLines({
      search: query,
      customerName: customerFilter,
    })
      .then((result) => {
        if (active) {
          setInvoices(result);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message || "Failed to load invoices.");
        }
      });

    return () => {
      active = false;
    };
  }, [customerFilter, query, reloadKey]);

  const customerOptions = useMemo(() => {
    const unique = new Set(invoices.map((invoice) => invoice.customerName));
    return ["", ...Array.from(unique).filter(Boolean)];
  }, [invoices]);

  const groupedInvoices = useMemo(() => {
    const grouped = new Map();

    invoices.forEach((line) => {
      const fallbackKey = `${line.customerName || "customer"}-${new Date(line.createdAt).toISOString().slice(0, 19)}`;
      const key = line.invoiceNumber || fallbackKey;

      if (!grouped.has(key)) {
        grouped.set(key, {
          invoiceNumber: key,
          customerName: line.customerName,
          createdAt: line.createdAt,
          lines: [],
          total: 0,
          itemsCount: 0,
        });
      }

      const invoice = grouped.get(key);
      const lineTotal = Number(line.price || 0) * Number(line.qty || 0);
      invoice.lines.push(line);
      invoice.total += lineTotal;
      invoice.itemsCount += Number(line.qty || 0);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [invoices]);

  const totalAmount = useMemo(
    () => groupedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    [groupedInvoices],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-slate-900">Saved Invoices</h2>
        <p className="mt-1 text-slate-600">
          View saved invoices grouped by invoice number.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by customer or product"
            className="w-full border-none bg-transparent text-sm text-slate-800 outline-none"
          />
        </label>

        <select
          value={customerFilter}
          onChange={(event) => setCustomerFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
        >
          {customerOptions.map((name) => (
            <option key={name || "all"} value={name}>
              {name || "All customers"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-125 overflow-auto">
          <table className="w-full min-w-245 border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {groupedInvoices.map((invoice) => {
                const expanded = expandedInvoiceId === invoice.invoiceNumber;

                return (
                  <Fragment key={invoice.invoiceNumber}>
                    <tr
                      key={invoice.invoiceNumber}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(invoice.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {invoice.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {invoice.itemsCount}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedInvoiceId((current) =>
                              current === invoice.invoiceNumber
                                ? ""
                                : invoice.invoiceNumber,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr
                        key={`${invoice.invoiceNumber}-lines`}
                        className="border-t border-slate-100 bg-slate-50"
                      >
                        <td colSpan={6} className="px-4 py-3">
                          <div className="overflow-auto">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="text-slate-600">
                                  <th className="px-2 py-1">Product</th>
                                  <th className="px-2 py-1">Unit Price</th>
                                  <th className="px-2 py-1">Qty</th>
                                  <th className="px-2 py-1">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoice.lines.map((line) => (
                                  <tr
                                    key={line.id}
                                    className="border-t border-slate-200"
                                  >
                                    <td className="px-2 py-1 text-slate-700">
                                      {line.productName}
                                    </td>
                                    <td className="px-2 py-1 text-slate-700">
                                      {formatCurrency(line.price)}
                                    </td>
                                    <td className="px-2 py-1 text-slate-700">
                                      {line.qty}
                                    </td>
                                    <td className="px-2 py-1 text-slate-700">
                                      {formatCurrency(
                                        Number(line.price || 0) *
                                          Number(line.qty || 0),
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        Invoices: {groupedInvoices.length} | Total value:{" "}
        {formatCurrency(totalAmount)}
      </p>
      {message && (
        <p className="text-sm font-medium text-slate-800">{message}</p>
      )}
    </section>
  );
}

export default InvoicesPage;
