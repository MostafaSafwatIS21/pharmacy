import { Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "../services/customerDataSource";

const EMPTY_FORM = {
  name: "",
  location: "",
  phoneNumber: "",
};

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadCustomers = async (search = "") => {
    const result = await listCustomers({ search });
    setCustomers(result);
  };

  useEffect(() => {
    loadCustomers().catch(() => setMessage("تعذر تحميل العملاء."));
  }, []);

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.location, customer.phoneNumber]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [customers, query]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      if (editingId) {
        await updateCustomer({ id: editingId, ...form });
        setMessage("تم تحديث العميل.");
      } else {
        await addCustomer(form);
        setMessage("تمت إضافة العميل.");
      }

      resetForm();
      await loadCustomers();
    } catch (error) {
      setMessage(error.message || "فشل حفظ بيانات العميل.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      location: customer.location || "",
      phoneNumber: customer.phoneNumber || "",
    });
  };

  const removeCustomer = async (customer) => {
    setMessage("");
    setIsLoading(true);

    try {
      await deleteCustomer({ id: customer.id, name: customer.name });
      setMessage("تم حذف العميل.");
      await loadCustomers();
      if (editingId === customer.id) {
        resetForm();
      }
    } catch (error) {
      setMessage(error.message || "فشل حذف العميل.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-slate-900">العملاء</h2>
        <p className="mt-1 text-slate-600">
          إضافة وتعديل وحذف العملاء المستخدمين في الفواتير.
        </p>
      </div>

      <form
        onSubmit={submitForm}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
      >
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="اسم العميل"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
          required
        />
        <input
          value={form.location}
          onChange={(event) =>
            setForm((current) => ({ ...current, location: event.target.value }))
          }
          placeholder="العنوان"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
          required
        />
        <input
          value={form.phoneNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              phoneNumber: event.target.value,
            }))
          }
          placeholder="رقم الهاتف"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <UserPlus size={15} />
            {editingId ? "تحديث" : "إضافة"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
        <Search size={16} className="text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="بحث عن عميل"
          className="w-full border-none bg-transparent text-sm text-slate-800 outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-125 overflow-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">العنوان</th>
                <th className="px-4 py-3">الهاتف</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {customer.location}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {customer.phoneNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(customer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        <Pencil size={13} />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomer(customer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                      >
                        <Trash2 size={13} />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-slate-700">
        عدد العملاء: {visibleCustomers.length}
      </p>
      {message && (
        <p className="text-sm font-medium text-slate-800">{message}</p>
      )}
    </section>
  );
}

export default CustomersPage;
