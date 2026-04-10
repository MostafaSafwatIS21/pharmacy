import { Search, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  deleteInvoiceGroup,
  listInvoiceLines,
} from "../services/invoiceDataSource";

const formatCurrency = (value) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(Number(value || 0));

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState("");
  const [message, setMessage] = useState("");

  const handleDeleteInvoice = async (invoice) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟");
    if (!confirmed) {
      return;
    }

    setDeletingInvoiceId(invoice.groupId);
    setMessage("");

    try {
      const result = await deleteInvoiceGroup({
        invoiceNumber: invoice.invoiceNumber,
        lineIds: invoice.lines.map((line) => line.id),
      });
      setMessage(
        `تم حذف الفاتورة. عدد السطور المحذوفة: ${result.deletedCount}.`,
      );
      setExpandedInvoiceId((current) =>
        current === invoice.groupId ? "" : current,
      );
      setReloadKey((value) => value + 1);
    } catch (error) {
      setMessage(error.message || "فشل حذف الفاتورة.");
    } finally {
      setDeletingInvoiceId("");
    }
  };

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
          setMessage(error.message || "تعذر تحميل الفواتير.");
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
          groupId: key,
          invoiceNumber: String(line.invoiceNumber || "").trim(),
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
        <h2 className="font-display text-2xl text-slate-900">
          الفواتير المحفوظة
        </h2>
        <p className="mt-1 text-slate-600">
          عرض الفواتير المحفوظة مجمعة برقم الفاتورة.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث بالعميل أو المنتج أو رقم الفاتورة"
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
              {name || "كل العملاء"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          تحديث
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-125 overflow-auto">
          <table className="w-full min-w-245 border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">رقم الفاتورة</th>
                <th className="px-4 py-3">العميل</th>
                <th className="px-4 py-3">عدد الأصناف</th>
                <th className="px-4 py-3">الإجمالي</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {groupedInvoices.map((invoice) => {
                const expanded = expandedInvoiceId === invoice.groupId;
                const isDeleting = deletingInvoiceId === invoice.groupId;

                return (
                  <Fragment key={invoice.groupId}>
                    <tr
                      key={invoice.groupId}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(invoice.createdAt).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {invoice.groupId}
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedInvoiceId((current) =>
                                current === invoice.groupId
                                  ? ""
                                  : invoice.groupId,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            {expanded ? "إخفاء" : "عرض"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(invoice)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                            {isDeleting ? "جارٍ الحذف..." : "حذف"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr
                        key={`${invoice.groupId}-lines`}
                        className="border-t border-slate-100 bg-slate-50"
                      >
                        <td colSpan={6} className="px-4 py-3">
                          <div className="overflow-auto">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="text-slate-600">
                                  <th className="px-2 py-1">المنتج</th>
                                  <th className="px-2 py-1">سعر الوحدة</th>
                                  <th className="px-2 py-1">الكمية</th>
                                  <th className="px-2 py-1">إجمالي السطر</th>
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
        الفواتير: {groupedInvoices.length} | إجمالي القيمة:{" "}
        {formatCurrency(totalAmount)}
      </p>
      {message && (
        <p className="text-sm font-medium text-slate-800">{message}</p>
      )}
    </section>
  );
}

export default InvoicesPage;
