import { Printer, Search, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import DocumentHeader from "../components/DocumentHeader";
import {
  deleteInvoiceGroup,
  listInvoiceLines,
} from "../services/invoiceDataSource";
import {
  deleteQuotationByInvoiceNumber,
  listQuotationLines,
} from "../services/quotationDataSource";
import { numberToArabicCurrencyText } from "../utils/arabicCurrency";

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
  const [approvedInvoiceNumbers, setApprovedInvoiceNumbers] = useState(
    new Set(),
  );
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const printRef = useRef(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoiceToPrint
      ? `invoice-${invoiceToPrint.invoiceNumber || invoiceToPrint.groupId}`
      : "invoice",
  });

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

      let linkedQuotationDeletedCount = 0;
      const isFromQuotation = String(invoice.source || "").includes("عرض سعر");
      if (isFromQuotation && String(invoice.invoiceNumber || "").trim()) {
        const quotationDelete = await deleteQuotationByInvoiceNumber({
          invoiceNumber: invoice.invoiceNumber,
        });
        linkedQuotationDeletedCount = Number(quotationDelete.deletedCount || 0);
      }

      if (linkedQuotationDeletedCount > 0) {
        setMessage(
          `تم حذف الفاتورة (${result.deletedCount} سطر) وتم حذف عرض السعر المرتبط (${linkedQuotationDeletedCount} سطر).`,
        );
      } else {
        setMessage(
          `تم حذف الفاتورة. عدد السطور المحذوفة: ${result.deletedCount}.`,
        );
      }
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

    Promise.all([
      listInvoiceLines({
        search: query,
        customerName: customerFilter,
      }),
      listQuotationLines({ status: "APPROVED" }),
    ])
      .then(([invoiceRows, approvedQuotationRows]) => {
        if (active) {
          setInvoices(invoiceRows);
          const approvedSet = new Set(
            approvedQuotationRows
              .map((row) => String(row.approvedInvoiceNumber || "").trim())
              .filter(Boolean),
          );
          setApprovedInvoiceNumbers(approvedSet);
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
        const normalizedInvoiceNumber = String(line.invoiceNumber || "").trim();
        const source = approvedInvoiceNumbers.has(normalizedInvoiceNumber)
          ? "من عرض سعر"
          : "فاتورة مباشرة";

        grouped.set(key, {
          groupId: key,
          invoiceNumber: normalizedInvoiceNumber,
          customerName: line.customerName,
          createdAt: line.createdAt,
          lines: [],
          total: 0,
          itemsCount: 0,
          source,
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
  }, [approvedInvoiceNumbers, invoices]);

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
                <th className="px-4 py-3">المصدر</th>
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
                        {invoice.source}
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
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceToPrint(invoice);
                              setTimeout(() => {
                                handlePrintInvoice();
                              }, 0);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            <Printer size={13} />
                            طباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr
                        key={`${invoice.groupId}-lines`}
                        className="border-t border-slate-100 bg-slate-50"
                      >
                        <td colSpan={7} className="px-4 py-3">
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

      {invoiceToPrint && (
        <article
          ref={printRef}
          dir="rtl"
          className="a4-sheet fixed top-0 rounded-2xl border border-slate-300 bg-white p-6 text-right print:static print:border-none print:p-0"
          style={{ left: "-9999px" }}
        >
          <DocumentHeader title="فاتورة مبيعات | SALES INVOICE" />

          <div className="mb-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-900">التاريخ:</span>{" "}
              {new Date(invoiceToPrint.createdAt).toLocaleDateString("ar-EG")}
            </p>
            <p>
              <span className="font-semibold text-slate-900">الوقت:</span>{" "}
              {new Date(invoiceToPrint.createdAt).toLocaleTimeString("ar-EG")}
            </p>
            <p>
              <span className="font-semibold text-slate-900">العميل:</span>{" "}
              {invoiceToPrint.customerName || "عميل"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">
                رقم الفاتورة:
              </span>{" "}
              {invoiceToPrint.invoiceNumber || invoiceToPrint.groupId}
            </p>
          </div>

          <table className="mb-4 w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-800 text-white">
                <th className="px-2 py-2">م</th>
                <th className="px-2 py-2">الصنف</th>
                <th className="px-2 py-2">سعر الوحدة</th>
                <th className="px-2 py-2">الكمية</th>
                <th className="px-2 py-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoiceToPrint.lines.map((line, index) => (
                <tr
                  key={line.id}
                  className={`border-b border-slate-200 ${index === 0 ? "bg-slate-100" : ""}`}
                >
                  <td className="px-2 py-2 font-semibold text-slate-700">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {line.productName}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {formatCurrency(line.price)}
                  </td>
                  <td className="px-2 py-2 text-slate-700">{line.qty}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(
                      Number(line.price || 0) * Number(line.qty || 0),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <p className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-base font-bold text-white">
              <span>إجمالي السعر</span>
              <span>{formatCurrency(invoiceToPrint.total)}</span>
            </p>
          </div>

          <p className="mt-3 max-w-2xl text-right text-sm font-semibold leading-7 text-slate-700">
            مبلغ وقدره {numberToArabicCurrencyText(invoiceToPrint.total)}
          </p>

          <p className="mt-6 text-center text-sm font-medium text-slate-600">
            ثقتكم نجاحنا
          </p>
        </article>
      )}
    </section>
  );
}

export default InvoicesPage;
