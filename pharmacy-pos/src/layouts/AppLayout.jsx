import {
  ClipboardList,
  ContactRound,
  FileSpreadsheet,
  ListOrdered,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useCatalogStore } from "../store/useCatalogStore";

const navItems = [
  { to: "/import", label: "استيراد البيانات", icon: FileSpreadsheet },
  { to: "/items", label: "المنتجات", icon: ClipboardList },
  { to: "/customers", label: "العملاء", icon: ContactRound },
  { to: "/invoices", label: "الفواتير", icon: ListOrdered },
  { to: "/quotation", label: "عرض السعر", icon: ReceiptText },
  { to: "/pos", label: "فاتورة البيع", icon: ShoppingCart },
];

function AppLayout() {
  const itemsCount = useCatalogStore((state) => state.items.length);
  const selectedCount = useCatalogStore(
    (state) => state.selectedItemIds.length,
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#f7f7d4_0%,#f2f5ea_30%,#eef3f9_70%)] px-4 py-6 sm:px-8 sm:py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200/70 bg-white/85 shadow-2xl shadow-slate-300/40 backdrop-blur-sm print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        <header className="border-b border-slate-200 px-6 py-5 sm:px-10 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl text-slate-900 sm:text-3xl">
                الفؤاد للتجهيزات الطبية
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                نظام إدارة المبيعات والفواتير للطباعة.
              </p>
            </div>
            <div className="flex gap-2 text-xs sm:text-sm">
              <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
                المنتجات: {itemsCount}
              </span>
              <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">
                المختار: {selectedCount}
              </span>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-4 sm:px-10 print:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="px-6 py-6 sm:px-10 sm:py-8 print:px-0 print:py-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
