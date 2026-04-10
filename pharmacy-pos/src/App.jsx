import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import DataImportPage from "./pages/DataImportPage";
import ItemsDirectoryPage from "./pages/ItemsDirectoryPage";
import CustomersPage from "./pages/CustomersPage";
import PosPage from "./pages/PosPage";
import QuotationPage from "./pages/QuotationPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/import" replace />} />
        <Route path="/import" element={<DataImportPage />} />
        <Route path="/items" element={<ItemsDirectoryPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/quotation" element={<QuotationPage />} />
        <Route path="/pos" element={<PosPage />} />
      </Route>
    </Routes>
  );
}

export default App;
