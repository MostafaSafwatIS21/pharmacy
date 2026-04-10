import { Printer, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import { addCustomer, listCustomers } from "../services/customerDataSource";
import { useCatalogStore } from "../store/useCatalogStore";

const formatCurrency = (value) => `$${value.toFixed(2)}`;

function QuotationPage() {
  const items = useCatalogStore((state) => state.items);
  const selectedItemIds = useCatalogStore((state) => state.selectedItemIds);
  const [representative, setRepresentative] = useState("مندوب");
  const [customerName, setCustomerName] = useState("Customer Name");
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
        const taxAmount = item.price * (safeTaxRate / 100);
        return {
          ...item,
          taxAmount,
          priceAfterTax: item.price + taxAmount,
        };
      }),
    [safeTaxRate, selectedItems],
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
      .catch(() => setCustomerMessage("Failed to load customers."));
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
      setCustomerMessage("Customer added and selected.");
    } catch (error) {
      setCustomerMessage(error.message || "Failed to add customer.");
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
        <h2 className="font-display text-2xl text-slate-900">
          Quotation Generator
        </h2>
        <p className="text-slate-700">
          No selected products yet. Select products first from Items Directory.
        </p>
        <Link
          to="/items"
          className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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
              Quotation Generator
            </h2>
            <p className="mt-1 text-slate-600">
              Print selected products using name, price, and price tax
              additions.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Printer size={16} />
              Print Quotation
            </button>
            <Link
              to="/items"
              className="inline-flex rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Back to Items Directory
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Customer</span>
            <select
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            >
              <option value="Customer Name">Customer Name</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.name}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">
              Representative (مندوب)
            </span>
            <input
              value={representative}
              onChange={(event) => setRepresentative(event.target.value)}
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

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAddCustomer((current) => !current)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {showAddCustomer ? "Hide Add Customer" : "Add New Customer"}
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
              placeholder="Name"
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
              placeholder="Location"
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
              placeholder="Phone Number"
              required
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Save Customer
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
            Row number
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
              className="h-4 w-4"
            />
            Product price
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={showTaxAmount}
              onChange={(event) => setShowTaxAmount(event.target.checked)}
              className="h-4 w-4"
            />
            Tax amount
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

      <article
        ref={printRef}
        className="a4-sheet rounded-2xl border border-slate-300 bg-white p-6 print:border-none print:p-0"
      >
        <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display text-2xl text-slate-900">Quotation</h3>
            <p className="text-sm text-slate-600">
              Quote Date: {quoteDate.toLocaleDateString()}
            </p>
          </div>
          <ReceiptText size={30} className="text-slate-400" />
        </div>

        <div className="mb-4 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Customer:</span>{" "}
            {customerName || "Customer Name"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">
              Representative (مندوب):
            </span>{" "}
            {representative || "مندوب"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Tax Rate:</span>{" "}
            {safeTaxRate}%
          </p>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-slate-300 text-slate-700">
              {showRowNumber && <th className="px-2 py-2">#</th>}
              <th className="px-2 py-2">Product</th>
              {showPrice && <th className="px-2 py-2">Price</th>}
              {showTaxAmount && <th className="px-2 py-2">Tax Amount</th>}
              {showPriceAfterTax && (
                <th className="px-2 py-2">Price After Tax</th>
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
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between text-slate-700">
            <span>Tax ({safeTaxRate}%)</span>
            <span>{formatCurrency(totalTax)}</span>
          </p>
          <p className="flex justify-between font-semibold text-slate-900">
            <span>Total Quotation</span>
            <span>{formatCurrency(totalAfterTax)}</span>
          </p>
        </div>

        <div className="mt-10 grid gap-6 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">
              Representative Signature:
            </span>{" "}
            __________________
          </p>
          <p className="sm:text-right">
            <span className="font-semibold text-slate-900">
              Customer Signature:
            </span>{" "}
            __________________
          </p>
        </div>
      </article>
    </section>
  );
}

export default QuotationPage;
