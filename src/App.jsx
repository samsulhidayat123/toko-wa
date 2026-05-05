import { useEffect, useState } from "react";
import Header from "./components/Header";
import CustomerPage from "./pages/CustomerPage";
import AdminPage from "./pages/AdminPage";
import AdminLogin from "./components/AdminLogin";
import { defaultProducts } from "./data/defaultProducts";
import { getStorage, setStorage } from "./utils/storage"; // Tetap dipakai untuk cart & qris
import { clearAdminSession, isAdminSessionValid } from "./utils/adminAuth";
import {
  SPREADSHEET_API_URL,
  getQrisImageFromRows,
  isAppSettingsRow,
  isSpreadsheetApiConfigured,
  normalizeProductRow,
} from "./utils/api";

export default function App() {
  const [page, setPage] = useState("customer");

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return isAdminSessionValid();
  });

  // State untuk produk, sekarang dari API
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State lain tetap menggunakan localStorage
  const [cart, setCart] = useState(() => getStorage("cart", []));
  const [qrisImage, setQrisImage] = useState(() =>
    getStorage("qris_image", "")
  );

  // Fungsi untuk mengambil data produk dari Spreadsheet API
  async function fetchProducts() {
    if (!isSpreadsheetApiConfigured()) {
      setProducts(defaultProducts);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(SPREADSHEET_API_URL);
      if (!response.ok) throw new Error("Gagal mengambil data produk.");
      const data = await response.json();
      setQrisImage(getQrisImageFromRows(data));

      const productRows = data.filter((product) => !isAppSettingsRow(product));
      const formatted = productRows.map(normalizeProductRow);
      setProducts(formatted);
    } catch (err) {
      setError(err.message);
      setProducts(defaultProducts); // Fallback ke data contoh jika gagal
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setStorage("cart", cart);
  }, [cart]);

  useEffect(() => {
    setStorage("qris_image", qrisImage);
  }, [qrisImage]);

  // Ambil data produk saat komponen pertama kali dimuat
  useEffect(() => {
    queueMicrotask(fetchProducts);
  }, []);

  function handleAdminLogin() {
    setIsAdminLoggedIn(true);
    setPage("admin");
  }

  function handleAdminLogout() {
    clearAdminSession();
    setIsAdminLoggedIn(false);
    setPage("customer");
  }

  return (
    <>
      <Header
        page={page}
        setPage={setPage}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={handleAdminLogout}
      />

      {page === "customer" && (
        <CustomerPage
          products={products}
          setProducts={setProducts}
          cart={cart}
          setCart={setCart}
          qrisImage={qrisImage}
          isLoading={isLoading}
          error={error}
        />
      )}

      {page === "admin" && !isAdminLoggedIn && (
        <AdminLogin onLogin={handleAdminLogin} />
      )}

      {page === "admin" && isAdminLoggedIn && (
        <AdminPage
          products={products}
          setProducts={setProducts}
          setCart={setCart}
          qrisImage={qrisImage}
          setQrisImage={setQrisImage}
          fetchProducts={fetchProducts}
          isLoading={isLoading}
          error={error}
        />
      )}
    </>
  );
}
