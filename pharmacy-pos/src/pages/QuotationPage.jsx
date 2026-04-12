import { Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import DocumentHeader from "../components/DocumentHeader";
import { addCustomer, listCustomers } from "../services/customerDataSource";
import {
  approveQuotationToInvoice,
  deleteQuotationGroup,
  listQuotationLines,
  saveQuotationLines,
} from "../services/quotationDataSource";
import { useCatalogStore } from "../store/useCatalogStore";
import {
  formatCurrency,
  numberToArabicCurrencyText,
} from "../utils/arabicCurrency";

function QuotationPage() {
  const items = useCatalogStore((state) => state.items);
  const selectedItemIds = useCatalogStore((state) => state.selectedItemIds);
  const [representative, setRepresentative] = useState("مندوب");
  const [customerName, setCustomerName] = useState("العميل");
  const [customers, setCustomers] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    location: "",
    phoneNumber: "",
  });
  const [customerMessage, setCustomerMessage] = useState("");
  const [taxRate, setTaxRate] = useState(14);
  const [showRowNumber, setShowRowNumber] = useState(true);
  const [showQuantity, setShowQuantity] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showTaxAmount, setShowTaxAmount] = useState(true);
  const [showPriceAfterTax, setShowPriceAfterTax] = useState(true);
  const [quotePriceById, setQuotePriceById] = useState({});
  const [quoteQuantityById, setQuoteQuantityById] = useState({});
  const [quotationMessage, setQuotationMessage] = useState("");
  const [savedQuotations, setSavedQuotations] = useState([]);
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);
  const [approvingQuoteNumber, setApprovingQuoteNumber] = useState("");
  const [savedQuoteNumber, setSavedQuoteNumber] = useState("");
  const [expandedQuoteNumber, setExpandedQuoteNumber] = useState("");
  const [quoteToPrintAsInvoice, setQuoteToPrintAsInvoice] = useState(null);
  const printRef = useRef(null);
  const invoicePrintRef = useRef(null);

  const selectedIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  );
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );
  const safeTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const selectedItemsWithTax = useMemo(
    () =>
      selectedItems.map((item) => {
        const price = Math.max(
          0,
          Number(quotePriceById[item.id] ?? item.price) || 0,
        );
        const quantity = Math.max(1, Number(quoteQuantityById[item.id] || 1));
        const lineTotal = price * quantity;
        const taxAmount = lineTotal * (safeTaxRate / 100);
        return {
          ...item,
          price,
          quantity,
          lineTotal,
          taxAmount,
          priceAfterTax: lineTotal + taxAmount,
        };
      }),
    [quotePriceById, quoteQuantityById, safeTaxRate, selectedItems],
  );

  const subtotal = useMemo(
    () => selectedItemsWithTax.reduce((sum, item) => sum + item.lineTotal, 0),
    [selectedItemsWithTax],
  );
  const totalTax = useMemo(
    () => selectedItemsWithTax.reduce((sum, item) => sum + item.taxAmount, 0),
    [selectedItemsWithTax],
  );
  const totalAfterTax = subtotal + totalTax;
  const totalAfterTaxInArabic = useMemo(
    () => numberToArabicCurrencyText(totalAfterTax),
    [totalAfterTax],
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.name === customerName) || null,
    [customers, customerName],
  );
  const customerPhoneNumber = selectedCustomer?.phoneNumber || "-";
  const customerLocation = selectedCustomer?.location || "-";

  const groupedSavedQuotations = useMemo(() => {
    const grouped = new Map();

    for (const line of savedQuotations) {
      const quoteNumber = String(line.quoteNumber || "").trim();
      if (!quoteNumber) {
        continue;
      }

      if (!grouped.has(quoteNumber)) {
        grouped.set(quoteNumber, {
          quoteNumber,
          customerName: line.customerName || "",
          customerPhone: line.customerPhone || "",
          customerLocation: line.customerLocation || "",
          representative: line.representative || "",
          taxRate: Number(line.taxRate || 0),
          createdAt: line.createdAt || "",
          status: line.status || "PENDING",
          approvedInvoiceNumber: line.approvedInvoiceNumber || "",
          subtotal: 0,
          totalTax: 0,
          totalAfterTax: 0,
          rowsCount: 0,
          lines: [],
        });
      }

      const group = grouped.get(quoteNumber);
      const qty = Number(line.qty || 0);
      const price = Number(line.price || 0);
      const lineTotal = price * qty;
      const lineTax = lineTotal * (Number(line.taxRate || 0) / 100);

      group.subtotal += lineTotal;
      group.totalTax += lineTax;
      group.totalAfterTax += lineTotal + lineTax;
      group.rowsCount += 1;
      group.lines.push({
        id: line.id,
        name: line.productName,
        price,
        qty,
        lineTotal,
        taxAmount: lineTax,
        totalAfterTax: lineTotal + lineTax,
      });
      if (!group.approvedInvoiceNumber && line.approvedInvoiceNumber) {
        group.approvedInvoiceNumber = line.approvedInvoiceNumber;
      }
    }

    return Array.from(grouped.values()).sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
  }, [savedQuotations]);

  const refreshSavedQuotations = async () => {
    const rows = await listQuotationLines();
    setSavedQuotations(rows);
  };

  useEffect(() => {
    Promise.all([listCustomers(), listQuotationLines()])
      .then(([customerRows, quotationRows]) => {
        setCustomers(customerRows);
        setSavedQuotations(quotationRows);
      })
      .catch(() => setCustomerMessage("تعذر تحميل البيانات."));
  }, []);

  const submitNewCustomer = async (event) => {
    event.preventDefault();
    setCustomerMessage("");

    try {
      const created = await addCustomer(customerForm);
      const updated = await listCustomers();
      setCustomers(updated);
      setCustomerName(created.name);
      setCustomerForm({ name: "", location: "", phoneNumber: "" });
      setShowAddCustomer(false);
      setCustomerMessage("تمت إضافة العميل واختياره.");
    } catch (error) {
      setCustomerMessage(error.message || "فشل إضافة العميل.");
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "quotation",
  });

  const handlePrintAsInvoice = useReactToPrint({
    contentRef: invoicePrintRef,
    documentTitle: quoteToPrintAsInvoice
      ? `invoice-${quoteToPrintAsInvoice.approvedInvoiceNumber || quoteToPrintAsInvoice.quoteNumber}`
      : "invoice-from-quotation",
  });

  const handleSaveQuotation = async () => {
    if (isSavingQuotation) {
      return;
    }

    setQuotationMessage("");
    setIsSavingQuotation(true);

    try {
      const result = await saveQuotationLines({
        customerName,
        customerPhone: customerPhoneNumber,
        customerLocation,
        representative,
        taxRate: safeTaxRate,
        lineItems: selectedItemsWithTax,
      });

      setSavedQuoteNumber(result.quoteNumber || "");
      setQuotationMessage(
        `تم حفظ عرض السعر ${result.quoteNumber} بعدد ${result.rowsSaved} صنف.`,
      );
      await refreshSavedQuotations();
    } catch (error) {
      setQuotationMessage(error.message || "فشل حفظ عرض السعر.");
    } finally {
      setIsSavingQuotation(false);
    }
  };

  const handleApproveQuotation = async (quoteNumber) => {
    const normalizedQuoteNumber = String(quoteNumber || "").trim();
    if (!normalizedQuoteNumber || approvingQuoteNumber) {
      return;
    }

    setQuotationMessage("");
    setApprovingQuoteNumber(normalizedQuoteNumber);

    try {
      const result = await approveQuotationToInvoice({
        quoteNumber: normalizedQuoteNumber,
      });

      if (result.alreadyApproved) {
        setQuotationMessage(
          `عرض السعر ${normalizedQuoteNumber} معتمد مسبقًا على الفاتورة ${result.invoiceNumber}.`,
        );
      } else {
        setQuotationMessage(
          `تم اعتماد عرض السعر ${normalizedQuoteNumber} وتحويله إلى الفاتورة ${result.invoiceNumber}.`,
        );
      }

      await refreshSavedQuotations();
    } catch (error) {
      setQuotationMessage(error.message || "فشل اعتماد عرض السعر.");
    } finally {
      setApprovingQuoteNumber("");
    }
  };

  const handlePrintQuotationAsInvoice = (quoteNumber) => {
    const quote = groupedSavedQuotations.find(
      (row) => row.quoteNumber === String(quoteNumber || "").trim(),
    );

    if (!quote) {
      setQuotationMessage("عرض السعر غير موجود.");
      return;
    }

    if (String(quote.status || "").toUpperCase() !== "APPROVED") {
      setQuotationMessage("يمكن طباعة عرض السعر كفاتورة بعد اعتماده فقط.");
      return;
    }

    setQuoteToPrintAsInvoice(quote);
    setTimeout(() => {
      handlePrintAsInvoice();
    }, 0);
  };

  const handleDeleteQuotation = async (quoteNumber) => {
    const normalizedQuoteNumber = String(quoteNumber || "").trim();
    if (!normalizedQuoteNumber) {
      return;
    }

    const confirmed = window.confirm("هل أنت متأكد من حذف عرض السعر؟");
    if (!confirmed) {
      return;
    }

    setQuotationMessage("");

    try {
      const result = await deleteQuotationGroup({
        quoteNumber: normalizedQuoteNumber,
      });
      setQuotationMessage(
        `تم حذف عرض السعر ${normalizedQuoteNumber} بعدد ${result.deletedCount} سطر.`,
      );
      setExpandedQuoteNumber((current) =>
        current === normalizedQuoteNumber ? "" : current,
      );
      await refreshSavedQuotations();
    } catch (error) {
      setQuotationMessage(error.message || "فشل حذف عرض السعر.");
    }
  };

  const quoteDate = new Date();
  const hasSelectedItems = selectedItems.length > 0;

  return (
    <section className="space-y-6">
      <div className="screen-only rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-slate-900">عرض السعر</h2>
            <p className="mt-1 text-slate-600">
              طباعة المنتجات المحددة مع السعر والضريبة.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveQuotation}
              disabled={isSavingQuotation || !hasSelectedItems}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {isSavingQuotation ? "جارٍ الحفظ..." : "حفظ عرض السعر"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!hasSelectedItems}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Printer size={16} />
              طباعة عرض السعر
            </button>
            <Link
              to="/items"
              className="inline-flex rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              الرجوع إلى المنتجات
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">العميل</span>
            <select
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            >
              <option value="العميل">العميل</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">المندوب</span>
            <input
              value={representative}
              onChange={(event) => setRepresentative(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">نسبة الضريبة (%)</span>
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

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAddCustomer((current) => !current)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {showAddCustomer ? "إخفاء إضافة عميل" : "إضافة عميل جديد"}
          </button>
        </div>

        {showAddCustomer && (
          <form
            onSubmit={submitNewCustomer}
            className="mt-3 grid gap-3 rounded-xl border border-slate-300 p-3 sm:grid-cols-4"
          >
            <input
              value={customerForm.name}
              onChange={(event) =>
                setCustomerForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="الاسم"
              required
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
            />
            <input
              value={customerForm.location}
              onChange={(event) =>
                setCustomerForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="العنوان"
              required
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
            />
            <input
              value={customerForm.phoneNumber}
              onChange={(event) =>
                setCustomerForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
              placeholder="رقم الهاتف"
              required
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              حفظ العميل
            </button>
          </form>
        )}

        {customerMessage && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {customerMessage}
          </p>
        )}
        {quotationMessage && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {quotationMessage}
          </p>
        )}
        {savedQuoteNumber && (
          <p className="mt-1 text-xs text-slate-500">
            آخر عرض سعر محفوظ: {savedQuoteNumber}
          </p>
        )}

        <div className="mt-3 grid gap-2 rounded-xl border border-slate-300 p-3 text-sm sm:grid-cols-3">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showRowNumber}
              onChange={(event) => setShowRowNumber(event.target.checked)}
              className="h-4 w-4"
            />
            رقم الصف
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showQuantity}
              onChange={(event) => setShowQuantity(event.target.checked)}
              className="h-4 w-4"
            />
            الكمية
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
              className="h-4 w-4"
            />
            سعر المنتج
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showLineTotal}
              onChange={(event) => setShowLineTotal(event.target.checked)}
              className="h-4 w-4"
            />
            إجمالي السطر
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showTaxAmount}
              onChange={(event) => setShowTaxAmount(event.target.checked)}
              className="h-4 w-4"
            />
            قيمة الضريبة
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showPriceAfterTax}
              onChange={(event) => setShowPriceAfterTax(event.target.checked)}
              className="h-4 w-4"
            />
            السعر بعد الضريبة
          </label>
        </div>

        {!hasSelectedItems && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
            لا توجد منتجات محددة الآن. يمكنك اختيار منتجات جديدة أو متابعة
            العروض المحفوظة بالأسفل وعرض تفاصيلها وتحويلها لفاتورة.
          </div>
        )}

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">المنتج</th>
                <th className="px-3 py-2 text-left">سعر الوحدة في العرض</th>
                <th className="px-3 py-2 text-left">الكمية</th>
              </tr>
            </thead>
            <tbody>
              {selectedItemsWithTax.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        setQuotePriceById((current) => ({
                          ...current,
                          [item.id]: Math.max(
                            0,
                            Number(event.target.value || 0),
                          ),
                        }))
                      }
                      className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-right outline-none focus:border-slate-700"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        setQuoteQuantityById((current) => ({
                          ...current,
                          [item.id]: Math.max(
                            1,
                            Number(event.target.value || 1),
                          ),
                        }))
                      }
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right outline-none focus:border-slate-700"
                    />
                  </td>
                </tr>
              ))}
              {selectedItemsWithTax.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-slate-500"
                  >
                    لا توجد أصناف مختارة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          تعديل السعر هنا يطبق على عرض السعر المطبوع فقط ولا يغير سعر المنتج
          الأصلي.
        </p>
      </div>

      {hasSelectedItems && (
        <article
          ref={printRef}
          dir="rtl"
          className="a4-sheet rounded-2xl border border-slate-300 bg-white p-6 text-right print:border-none print:p-0"
        >
          <DocumentHeader title="عرض سعر | QUOTATION" />

          <div className="mb-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-900">
                  اسم العميل:
                </span>{" "}
                {customerName || "العميل"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">الهاتف:</span>{" "}
                {customerPhoneNumber}
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  عنوان العميل:
                </span>{" "}
                {customerLocation}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-900">رقم العرض:</span>{" "}
                {savedQuoteNumber || "غير محفوظ"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  تاريخ العرض:
                </span>{" "}
                {quoteDate.toLocaleDateString("ar-EG")}
              </p>
              <p>
                <span className="font-semibold text-slate-900">المندوب:</span>{" "}
                {representative || "مندوب"}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-800 text-white">
                {showRowNumber && <th className="px-2 py-2">م</th>}
                <th className="px-2 py-2">بيان الصنف</th>
                {showPrice && <th className="px-2 py-2">السعر</th>}
                {showQuantity && <th className="px-2 py-2">الكمية</th>}
                {showLineTotal && <th className="px-2 py-2">الإجمالي</th>}
                {showTaxAmount && <th className="px-2 py-2">الضريبة</th>}
                {showPriceAfterTax && (
                  <th className="px-2 py-2">بعد الضريبة</th>
                )}
              </tr>
            </thead>
            <tbody>
              {selectedItemsWithTax.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-200 ${index === 0 ? "bg-slate-100" : ""}`}
                >
                  {showRowNumber && (
                    <td className="px-2 py-2 text-slate-700">{index + 1}</td>
                  )}
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {item.name}
                  </td>
                  {showPrice && (
                    <td className="px-2 py-2 font-semibold text-slate-900">
                      {formatCurrency(item.price)}
                    </td>
                  )}
                  {showQuantity && (
                    <td className="px-2 py-2 font-semibold text-slate-900">
                      {item.quantity}
                    </td>
                  )}
                  {showLineTotal && (
                    <td className="px-2 py-2 font-semibold text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  )}
                  {showTaxAmount && (
                    <td className="px-2 py-2 font-semibold text-slate-900">
                      {formatCurrency(item.taxAmount)}
                    </td>
                  )}
                  {showPriceAfterTax && (
                    <td className="px-2 py-2 font-semibold text-slate-900">
                      {formatCurrency(item.priceAfterTax)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <p className="flex justify-between text-slate-700">
              <span>الإجمالي قبل الضريبة</span>
              <span>{formatCurrency(subtotal)}</span>
            </p>
            <p className="flex justify-between text-slate-700">
              <span>الضريبة ({safeTaxRate}%)</span>
              <span>{formatCurrency(totalTax)}</span>
            </p>
            <p className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-base font-bold text-white">
              <span>إجمالي عرض السعر</span>
              <span>{formatCurrency(totalAfterTax)}</span>
            </p>
          </div>

          <p className="mt-3 max-w-2xl text-right text-sm font-semibold leading-7 text-slate-700">
            مبلغ وقدره {totalAfterTaxInArabic}
          </p>

          <p className="mt-6 text-center text-sm font-medium text-slate-600">
            ثقتكم نجاحنا
          </p>
        </article>
      )}

      <div className="screen-only rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-slate-900">
            عروض السعر المحفوظة
          </h3>
          <span className="text-sm text-slate-500">
            {groupedSavedQuotations.length} عرض سعر
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-right">رقم العرض</th>
                <th className="px-3 py-2 text-right">العميل</th>
                <th className="px-3 py-2 text-right">المندوب</th>
                <th className="px-3 py-2 text-right">الإجمالي</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {groupedSavedQuotations.map((quote) => {
                const isApproved =
                  String(quote.status || "").toUpperCase() === "APPROVED";
                const isExpanded = expandedQuoteNumber === quote.quoteNumber;
                return (
                  <>
                    <tr
                      key={quote.quoteNumber}
                      className="border-t border-slate-200"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {quote.quoteNumber}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {quote.customerName}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {quote.representative}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {formatCurrency(quote.totalAfterTax)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {isApproved
                          ? `معتمد (${quote.approvedInvoiceNumber || ""})`
                          : "قيد الانتظار"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedQuoteNumber((current) =>
                                current === quote.quoteNumber
                                  ? ""
                                  : quote.quoteNumber,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {isExpanded ? "إخفاء التفاصيل" : "عرض كل الأصناف"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleApproveQuotation(quote.quoteNumber)
                            }
                            disabled={
                              isApproved ||
                              approvingQuoteNumber === quote.quoteNumber
                            }
                            className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {approvingQuoteNumber === quote.quoteNumber
                              ? "جارٍ التحويل..."
                              : "اعتماد وتحويل لفاتورة"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handlePrintQuotationAsInvoice(quote.quoteNumber)
                            }
                            disabled={!isApproved}
                            className="rounded-lg border border-slate-900 px-3 py-1 text-xs font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            طباعة كفاتورة
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteQuotation(quote.quoteNumber)
                            }
                            disabled={
                              isApproved ||
                              approvingQuoteNumber === quote.quoteNumber
                            }
                            className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            حذف عرض السعر
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="mb-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
                            <p>الهاتف: {quote.customerPhone || "-"}</p>
                            <p>العنوان: {quote.customerLocation || "-"}</p>
                            <p>عدد الأصناف: {quote.rowsCount}</p>
                            <p>
                              التاريخ:{" "}
                              {quote.createdAt
                                ? new Date(quote.createdAt).toLocaleString(
                                    "ar-EG",
                                  )
                                : "-"}
                            </p>
                          </div>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="border-y border-slate-300 text-slate-700">
                                <th className="px-2 py-1 text-right">م</th>
                                <th className="px-2 py-1 text-right">الصنف</th>
                                <th className="px-2 py-1 text-right">السعر</th>
                                <th className="px-2 py-1 text-right">الكمية</th>
                                <th className="px-2 py-1 text-right">
                                  الإجمالي
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {quote.lines.map((line, index) => (
                                <tr
                                  key={line.id}
                                  className="border-b border-slate-200"
                                >
                                  <td className="px-2 py-1">{index + 1}</td>
                                  <td className="px-2 py-1 font-semibold text-slate-800">
                                    {line.name}
                                  </td>
                                  <td className="px-2 py-1">
                                    {formatCurrency(line.price)}
                                  </td>
                                  <td className="px-2 py-1">{line.qty}</td>
                                  <td className="px-2 py-1">
                                    {formatCurrency(line.lineTotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {groupedSavedQuotations.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-slate-500"
                    colSpan={6}
                  >
                    لا توجد عروض أسعار محفوظة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {quoteToPrintAsInvoice && (
        <article
          ref={invoicePrintRef}
          dir="rtl"
          className="a4-sheet fixed top-0 rounded-2xl border border-slate-300 bg-white p-6 text-right print:static print:border-none print:p-0"
          style={{ left: "-9999px" }}
        >
          <DocumentHeader title="فاتورة مبيعات | SALES INVOICE" />

          <div className="mb-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-900">
                  اسم العميل:
                </span>{" "}
                {quoteToPrintAsInvoice.customerName || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">الهاتف:</span>{" "}
                {quoteToPrintAsInvoice.customerPhone || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  عنوان العميل:
                </span>{" "}
                {quoteToPrintAsInvoice.customerLocation || "-"}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold text-slate-900">
                  رقم الفاتورة:
                </span>{" "}
                {quoteToPrintAsInvoice.approvedInvoiceNumber || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  تاريخ الفاتورة:
                </span>{" "}
                {quoteToPrintAsInvoice.createdAt
                  ? new Date(
                      quoteToPrintAsInvoice.createdAt,
                    ).toLocaleDateString("ar-EG")
                  : new Date().toLocaleDateString("ar-EG")}
              </p>
              <p>
                <span className="font-semibold text-slate-900">المندوب:</span>{" "}
                {quoteToPrintAsInvoice.representative || "مندوب"}
              </p>
            </div>
          </div>

          <table className="mb-4 w-full border-collapse text-right text-sm">
            <thead>
              <tr className="border-y border-slate-800 bg-slate-800 text-white">
                <th className="px-2 py-2">م</th>
                <th className="px-2 py-2">الصنف</th>
                <th className="px-2 py-2">سعر الوحدة</th>
                <th className="px-2 py-2">الكمية</th>
                <th className="px-2 py-2">الإجمالي</th>
                <th className="px-2 py-2">الضريبة</th>
                <th className="px-2 py-2">بعد الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {quoteToPrintAsInvoice.lines.map((line, index) => (
                <tr
                  key={line.id}
                  className={`border-b border-slate-200 ${index === 0 ? "bg-slate-100" : ""}`}
                >
                  <td className="px-2 py-2 font-semibold text-slate-700">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {line.name}
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {formatCurrency(line.price)}
                  </td>
                  <td className="px-2 py-2 text-slate-700">{line.qty}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(line.lineTotal)}
                  </td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(line.taxAmount)}
                  </td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(line.totalAfterTax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <p className="flex justify-between text-slate-700">
              <span>الإجمالي قبل الضريبة</span>
              <span>{formatCurrency(quoteToPrintAsInvoice.subtotal)}</span>
            </p>
            <p className="flex justify-between text-slate-700">
              <span>الضريبة ({quoteToPrintAsInvoice.taxRate}%)</span>
              <span>{formatCurrency(quoteToPrintAsInvoice.totalTax)}</span>
            </p>
            <p className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-base font-bold text-white">
              <span>إجمالي السعر</span>
              <span>{formatCurrency(quoteToPrintAsInvoice.totalAfterTax)}</span>
            </p>
          </div>

          <p className="mt-3 max-w-2xl text-right text-sm font-semibold leading-7 text-slate-700">
            مبلغ وقدره{" "}
            {numberToArabicCurrencyText(quoteToPrintAsInvoice.totalAfterTax)}
          </p>

          <p className="mt-6 text-center text-sm font-medium text-slate-600">
            ثقتكم نجاحنا
          </p>
        </article>
      )}
    </section>
  );
}

export default QuotationPage;
