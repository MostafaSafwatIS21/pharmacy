import { Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import DocumentHeader from "../components/DocumentHeader";
import { addCustomer, listCustomers } from "../services/customerDataSource";
import { saveInvoiceLines } from "../services/invoiceDataSource";
import { useCatalogStore } from "../store/useCatalogStore";
import {
  formatCurrency,
  numberToArabicCurrencyText,
} from "../utils/arabicCurrency";

function PosPage() {
  const items = useCatalogStore((state) => state.items);
  const selectedItemIds = useCatalogStore((state) => state.selectedItemIds);
  const [customerName, setCustomerName] = useState("عميل نقدي");
  const [cashierName, setCashierName] = useState("الكاشير الرئيسي");
  const [customers, setCustomers] = useState([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    location: "",
    phoneNumber: "",
  });
  const [customerMessage, setCustomerMessage] = useState("");
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [taxRate, setTaxRate] = useState(14);
  const [showQuantity, setShowQuantity] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showTaxAmount, setShowTaxAmount] = useState(true);
  const [showPriceAfterTax, setShowPriceAfterTax] = useState(true);
  const [invoicePriceById, setInvoicePriceById] = useState({});
  const [quantityById, setQuantityById] = useState({});
  const [selectedRowId, setSelectedRowId] = useState("");
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState("");
  const [lastSavedCartFingerprint, setLastSavedCartFingerprint] = useState("");
  const invoiceRef = useRef(null);

  const selectedIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  );
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );
  const safeTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));

  const lineItems = useMemo(
    () =>
      selectedItems.map((item) => {
        const unitPrice = Math.max(
          0,
          Number(invoicePriceById[item.id] ?? item.price) || 0,
        );
        const quantity = Math.max(1, Number(quantityById[item.id] || 1));
        const lineTotal = unitPrice * quantity;
        const taxAmount = lineTotal * (safeTaxRate / 100);
        return {
          ...item,
          price: unitPrice,
          quantity,
          lineTotal,
          taxAmount,
          totalAfterTax: lineTotal + taxAmount,
        };
      }),
    [invoicePriceById, quantityById, selectedItems, safeTaxRate],
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * (safeTaxRate / 100);
  const grandTotal = subtotal + tax;
  const grandTotalInArabic = useMemo(
    () => numberToArabicCurrencyText(grandTotal),
    [grandTotal],
  );
  const cartFingerprint = useMemo(
    () =>
      JSON.stringify({
        customerName: String(customerName || "")
          .trim()
          .toLowerCase(),
        items: lineItems.map((item) => ({
          id: item.id,
          qty: item.quantity,
          price: Number(item.price || 0),
        })),
      }),
    [customerName, lineItems],
  );
  const canSaveInvoice = cartFingerprint !== lastSavedCartFingerprint;

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: "pos-invoice",
  });

  const handleRowSelect = (rowId) => {
    setSelectedRowId((current) => (current === rowId ? "" : rowId));
  };

  const selectedRowName =
    lineItems.find((item) => item.id === selectedRowId)?.name || "لا يوجد";
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.name === customerName) || null,
    [customers, customerName],
  );
  const customerPhoneNumber = selectedCustomer?.phoneNumber || "-";
  const customerLocation = selectedCustomer?.location || "-";

  useEffect(() => {
    listCustomers()
      .then((result) => setCustomers(result))
      .catch(() => setCustomerMessage("تعذر تحميل العملاء."));
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

  const handleSaveInvoice = async () => {
    if (isSavingInvoice) {
      return;
    }

    if (!canSaveInvoice) {
      setInvoiceMessage(
        "لا يمكن حفظ نفس الفاتورة مرة أخرى. غيّر العميل أو عدّل الأصناف أولًا.",
      );
      return;
    }

    setInvoiceMessage("");
    setIsSavingInvoice(true);

    try {
      const result = await saveInvoiceLines({
        customerName,
        lineItems,
      });
      if (result.duplicatePrevented) {
        setInvoiceMessage(
          "لا يمكن حفظ نفس الفاتورة مرة أخرى. غيّر العميل أو عدّل الأصناف أولًا.",
        );
      } else {
        setLastSavedCartFingerprint(cartFingerprint);
        setSavedInvoiceNumber(result.invoiceNumber || "");
        setInvoiceMessage(
          `تم حفظ الفاتورة ${result.invoiceNumber} بعدد ${result.rowsSaved} صنف.`,
        );
      }
    } catch (error) {
      setInvoiceMessage(error.message || "فشل حفظ الفاتورة.");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const today = new Date();

  if (selectedItems.length === 0) {
    return (
      <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-display text-2xl text-slate-900">فاتورة البيع</h2>
        <p className="text-slate-700">
          لا توجد أصناف محددة. اختر الأصناف أولًا من صفحة المنتجات.
        </p>
        <Link
          to="/items"
          className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          الرجوع إلى المنتجات
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
              فاتورة البيع
            </h2>
            <p className="mt-1 text-slate-600">
              الفاتورة تعتمد على الاسم والسعر مع حساب الضريبة.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={isSavingInvoice || !canSaveInvoice}
              className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {isSavingInvoice ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Printer size={16} />
              طباعة الفاتورة
            </button>
            <Link
              to="/items"
              className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              الرجوع إلى المنتجات
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">اسم العميل</span>
            <select
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            >
              <option value="عميل نقدي">عميل نقدي</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">اسم الكاشير</span>
            <input
              value={cashierName}
              onChange={(event) => setCashierName(event.target.value)}
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
        {invoiceMessage && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {invoiceMessage}
          </p>
        )}

        <div className="mt-3 grid gap-2 rounded-xl border border-slate-300 p-3 text-sm sm:grid-cols-3">
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
        <p className="mt-2 text-xs text-slate-600">
          تعديل سعر الوحدة هنا يطبق على هذه الفاتورة فقط ولا يغير سعر المنتج في
          قاعدة البيانات.
        </p>
      </div>

      <div className="screen-only overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-105 overflow-auto">
          <table className="w-full min-w-245 border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-800 text-white">
              <tr>
                <th className="px-4 py-3">الصنف</th>
                <th className="px-4 py-3">سعر الوحدة</th>
                {showQuantity && <th className="px-4 py-3">الكمية</th>}
                {showLineTotal && <th className="px-4 py-3">الإجمالي</th>}
                {showTaxAmount && <th className="px-4 py-3">الضريبة</th>}
                {showPriceAfterTax && (
                  <th className="px-4 py-3">الإجمالي بعد الضريبة</th>
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
                  <td className="px-4 py-3 text-slate-700">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setInvoicePriceById((current) => ({
                          ...current,
                          [item.id]: Math.max(
                            0,
                            Number(event.target.value || 0),
                          ),
                        }))
                      }
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right outline-none focus:border-slate-700"
                    />
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
                  {showTaxAmount && (
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(item.taxAmount)}
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
            <span>الإجمالي قبل الضريبة</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-700">
            <span>الضريبة ({safeTaxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-base font-semibold text-white">
            <span>إجمالي السعر</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-700">
          الصف المحدد: {selectedRowName}
        </p>
      </div>

      <article
        ref={invoiceRef}
        dir="rtl"
        className="a4-sheet rounded-2xl border border-slate-300 bg-white p-6 text-right print:border-none print:p-0"
      >
        <DocumentHeader title="فاتورة مبيعات | SALES INVOICE" />

        <div className="mb-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
          <div className="space-y-1 text-right">
            <p>
              <span className="font-semibold text-slate-900">اسم العميل:</span>{" "}
              {customerName || "عميل نقدي"}
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
              <span className="font-semibold text-slate-900">
                رقم الفاتورة:
              </span>{" "}
              {savedInvoiceNumber || "غير محفوظ"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">
                تاريخ الفاتورة:
              </span>{" "}
              {today.toLocaleDateString("ar-EG")}
            </p>
            <p>
              <span className="font-semibold text-slate-900">الكاشير:</span>{" "}
              {cashierName || "الكاشير الرئيسي"}
            </p>
          </div>
        </div>

        <table className="mb-4 w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-y border-slate-800 bg-slate-800 text-white">
              <th className="px-2 py-2">م</th>
              <th className="px-2 py-2">الصنف</th>
              <th className="px-2 py-2">سعر الوحدة</th>
              {showQuantity && <th className="px-2 py-2">الكمية</th>}
              {showLineTotal && <th className="px-2 py-2">الإجمالي</th>}
              {showTaxAmount && <th className="px-2 py-2">الضريبة</th>}
              {showPriceAfterTax && <th className="px-2 py-2">بعد الضريبة</th>}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr
                key={item.id}
                className={`border-b border-slate-200 ${index === 0 ? "bg-slate-100" : ""}`}
              >
                <td className="px-2 py-2 font-semibold text-slate-700">
                  {index + 1}
                </td>
                <td className="px-2 py-2 font-semibold text-slate-900">
                  {item.name}
                </td>
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
                {showTaxAmount && (
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatCurrency(item.taxAmount)}
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
            <span>الإجمالي قبل الضريبة</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between text-slate-700">
            <span>الضريبة ({safeTaxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </p>
          <p className="flex justify-between rounded-lg bg-slate-800 px-3 py-2 text-base font-bold text-white">
            <span>إجمالي السعر</span>
            <span>{formatCurrency(grandTotal)}</span>
          </p>
        </div>

        <p className="mt-3 max-w-2xl text-right text-lg font-semibold leading-7 text-slate-700">
          مبلغ وقدره {grandTotalInArabic}
        </p>

        <p className="mt-6 text-center text-sm font-medium text-slate-600">
          ثقتكم نجاحنا
        </p>
      </article>
    </section>
  );
}

export default PosPage;
