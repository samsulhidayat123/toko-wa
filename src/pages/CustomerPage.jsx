import { useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import CustomerForm from "../components/CustomerForm";
import CartBox from "../components/CartBox";
import ReceiptModal from "../components/ReceiptModal";
import { useNotification } from "../utils/notification";
import { reduceStockInSpreadsheet } from "../utils/api";
import { buildWhatsAppReceipt } from "../utils/whatsapp";

export default function CustomerPage({
  products,
  setProducts,
  cart,
  setCart,
  qrisImage,
  isLoading,
  error,
}) {
  const { notify } = useNotification();
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Semua");
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const categories = useMemo(() => {
    return ["Semua", ...new Set(products.map((item) => item.category).filter(Boolean))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchKeyword =
        (product.name || "").toLowerCase().includes(keyword.toLowerCase()) ||
        (product.description || "").toLowerCase().includes(keyword.toLowerCase());

      const matchCategory = category === "Semua" || product.category === category;

      return matchKeyword && matchCategory;
    });
  }, [products, keyword, category]);

  function buyNow(product) {
    if (Number(product.stock || 0) <= 0) {
      notify.warning("Stok produk habis.");
      return;
    }

    setCart([{ ...product, qty: 1 }]);

    setTimeout(() => {
      document.getElementById("checkout-section")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  }

  async function completeCheckout() {
    const whatsappUrl = buildWhatsAppReceipt(cart, customer, paymentMethod);
    const whatsappWindow = window.open("", "_blank");

    setIsCheckingOut(true);
    try {
      const updatedProducts = await reduceStockInSpreadsheet(cart);

      if (updatedProducts) {
        setProducts(updatedProducts);
      } else {
        setProducts(
          products.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            if (!cartItem) return product;

            return {
              ...product,
              stock: Math.max(0, Number(product.stock || 0) - Number(cartItem.qty || 0)),
            };
          })
        );
      }

      setCart([]);

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.open(whatsappUrl, "_blank");
      }
    } catch (err) {
      whatsappWindow?.close();
      notify.error(`Checkout gagal: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🔥 Promo Hari Ini • Pesan via WhatsApp</div>

          <h1>
            Belanja Apa Saja, <span>Checkout Langsung ke WA</span>
          </h1>

          <p>
            Web olshop serba ada untuk jual makanan, minuman, fashion, skincare,
            aksesoris, dan produk UMKM. Customer pilih produk, sistem otomatis
            membuat struk belanja untuk dikirim ke WhatsApp.
          </p>

          <div className="hero-actions">
            <a href="#produk" className="main-btn">
              Belanja Sekarang
            </a>
            <a href="#checkout-section" className="outline-btn">
              Lihat Keranjang
            </a>
          </div>
        </div>

        <div className="hero-promo-card">
          <div className="discount-label">WELCOME</div>
          <h2>Diskon Produk Pilihan</h2>
          <p>Tambah produk ke keranjang, isi data customer, lalu kirim struk ke WA.</p>
          <div className="promo-price">
            <span>Mulai dari</span>
            <strong>Rp1.000</strong>
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="section-heading">
          <h2>Kategori Cepat</h2>
          
        </div>

        <div className="category-list">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="promo-strip">
        <div>
          <strong>⚡ Promo Cepat</strong>
          <span> Produk terlaris, harga hemat, dan checkout langsung via WhatsApp.</span>
        </div>
      </section>

      <section id="produk">
        <div className="section-heading product-heading">
          <div>
            <h2>Produk Tersedia</h2>
            <p>Cari produk, pilih kategori, lalu tambahkan ke keranjang.</p>
          </div>

          <input
            className="search-input"
            type="text"
            placeholder="Cari produk..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="empty-box">Memuat produk...</div>
        ) : error ? (
          <div className="empty-box" style={{ backgroundColor: "#ffdddd", border: "1px solid #ffb8b8", color: "#d8000c" }}>
            <strong>Error:</strong> {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-box">Produk tidak ditemukan untuk filter saat ini.</div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cart={cart}
                setCart={setCart}
                onBuyNow={buyNow}
              />
            ))}
          </div>
        )}
      </section>

      <section id="checkout-section" className="checkout-grid">
        <CustomerForm customer={customer} setCustomer={setCustomer} />

        <CartBox
          cart={cart}
          setCart={setCart}
          customer={customer}
          onCheckout={completeCheckout}
          isCheckingOut={isCheckingOut}
          onPrint={() => {
            setReceiptInvoice("INV-" + Date.now());
            setShowReceipt(true);
          }}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          qrisImage={qrisImage}
        />
      </section>

      <ReceiptModal
        show={showReceipt}
        setShow={setShowReceipt}
        cart={cart}
        customer={customer}
        invoice={receiptInvoice}
        paymentMethod={paymentMethod}
        qrisImage={qrisImage}
      />
    </main>
  );
}
