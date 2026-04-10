import { Printer, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import { addCustomer, listCustomers } from "../services/customerDataSource";
import { useCatalogStore } from "../store/useCatalogStore";

const formatCurrency = (value) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(Number(value || 0));

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
  const [showPrice, setShowPrice] = useState(true);
  const [showTaxAmount, setShowTaxAmount] = useState(true);
  const [showPriceAfterTax, setShowPriceAfterTax] = useState(true);
  const [quotePriceById, setQuotePriceById] = useState({});
  const printRef = useRef(null);

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
        const taxAmount = price * (safeTaxRate / 100);
        return {
          ...item,
          price,
          taxAmount,
          priceAfterTax: price + taxAmount,
        };
      }),
    [quotePriceById, safeTaxRate, selectedItems],
  );

  const subtotal = useMemo(
    () => selectedItemsWithTax.reduce((sum, item) => sum + item.price, 0),
    [selectedItemsWithTax],
  );
  const totalTax = useMemo(
    () => selectedItemsWithTax.reduce((sum, item) => sum + item.taxAmount, 0),
    [selectedItemsWithTax],
  );
  const totalAfterTax = subtotal + totalTax;

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "quotation",
  });

  const quoteDate = new Date();

  if (selectedItems.length === 0) {
    return (
      <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-display text-2xl text-slate-900">عرض السعر</h2>
        <p className="text-slate-700">
          لا توجد منتجات محددة. اختر المنتجات أولًا من صفحة المنتجات.
        </p>
        <Link
          to="/items"
          className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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
            <h2 className="font-display text-2xl text-slate-900">عرض السعر</h2>
            <p className="mt-1 text-slate-600">
              طباعة المنتجات المحددة مع السعر والضريبة.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
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
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
              className="h-4 w-4"
            />
            سعر المنتج
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

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">المنتج</th>
                <th className="px-3 py-2 text-left">سعر الوحدة في العرض</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          تعديل السعر هنا يطبق على عرض السعر المطبوع فقط ولا يغير سعر المنتج
          الأصلي.
        </p>
      </div>

      <article
        ref={printRef}
        className="a4-sheet rounded-2xl border border-slate-300 bg-white p-6 print:border-none print:p-0"
      >
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display text-2xl text-slate-900">عرض سعر</h3>
            <p className="text-sm text-slate-600">
              تاريخ العرض: {quoteDate.toLocaleDateString("ar-EG")}
            </p>
          </div>
          <ReceiptText size={30} className="text-slate-400" />
        </div>

        <div className="mb-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">العميل:</span>{" "}
            {customerName || "العميل"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">المندوب:</span>{" "}
            {representative || "مندوب"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">نسبة الضريبة:</span>{" "}
            {safeTaxRate}%
          </p>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-slate-700">
              {showRowNumber && <th className="px-2 py-2">#</th>}
              <th className="px-2 py-2">المنتج</th>
              {showPrice && <th className="px-2 py-2">السعر</th>}
              {showTaxAmount && <th className="px-2 py-2">الضريبة</th>}
              {showPriceAfterTax && (
                <th className="px-2 py-2">السعر بعد الضريبة</th>
              )}
            </tr>
          </thead>
          <tbody>
            {selectedItemsWithTax.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-200">
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

        <div className="mt-4 ml-auto max-w-xs border-t border-slate-300 pt-3 text-sm">
          <p className="flex justify-between text-slate-700">
            <span>الإجمالي قبل الضريبة</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between text-slate-700">
            <span>الضريبة ({safeTaxRate}%)</span>
            <span>{formatCurrency(totalTax)}</span>
          </p>
          <p className="flex justify-between font-semibold text-slate-900">
            <span>إجمالي عرض السعر</span>
            <span>{formatCurrency(totalAfterTax)}</span>
          </p>
        </div>

        <div className="mt-10 grid gap-6 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">توقيع المندوب:</span>{" "}
            __________________
          </p>
          <p className="sm:text-right">
            <span className="font-semibold text-slate-900">توقيع العميل:</span>{" "}
            __________________
          </p>
        </div>
      </article>
    </section>
  );
}

export default QuotationPage;
