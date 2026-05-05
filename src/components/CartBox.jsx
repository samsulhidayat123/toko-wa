import { formatRupiah } from "../utils/format";
import { useNotification } from "../utils/notification";

export default function CartBox({
  cart,
  setCart,
  customer,
  onCheckout,
  isCheckingOut,
  onPrint,
  paymentMethod,
  setPaymentMethod,
  qrisImage,
}) {
  const { notify } = useNotification();
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  function updateQty(id, qty) {
    const selected = cart.find((item) => item.id === id);
    const stock = Number(selected?.stock || 0);

    if (qty <= 0) {
      setCart(cart.filter((item) => item.id !== id));
      return;
    }

    if (qty > stock) {
      notify.warning(`Stok "${selected?.name}" hanya ${stock}.`);
      return;
    }

    setCart(cart.map((item) => (item.id === id ? { ...item, qty } : item)));
  }

  function validateOrder() {
    if (!customer.name || !customer.phone || !customer.address) {
      notify.warning("Nama, nomor HP, dan alamat wajib diisi.");
      return false;
    }

    if (cart.length === 0) {
      notify.warning("Keranjang masih kosong.");
      return false;
    }

    const unavailableItem = cart.find((item) => Number(item.stock || 0) <= 0);
    if (unavailableItem) {
      notify.warning(`Stok "${unavailableItem.name}" habis.`);
      return false;
    }

    const overStockItem = cart.find(
      (item) => Number(item.qty || 0) > Number(item.stock || 0)
    );
    if (overStockItem) {
      notify.warning(`Jumlah "${overStockItem.name}" melebihi stok tersedia.`);
      return false;
    }

    if (paymentMethod === "qris" && !qrisImage) {
      notify.warning("QRIS belum diupload admin. Silakan upload QRIS dulu di halaman admin.");
      return false;
    }

    return true;
  }

  async function checkout() {
    if (!validateOrder()) return;

    await onCheckout();
  }

  function handlePrint() {
    if (!validateOrder()) return;
    onPrint();
  }

  return (
    <div className="panel">
      <h2>Keranjang</h2>

      {cart.length === 0 ? (
        <p>Keranjang masih kosong.</p>
      ) : (
        cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p>
                {item.qty} x {formatRupiah(item.price)}
              </p>
            </div>

            <div className="qty">
              <button onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
              <span>{item.qty}</span>
              <button
                onClick={() => updateQty(item.id, item.qty + 1)}
                disabled={Number(item.qty || 0) >= Number(item.stock || 0)}
              >
                +
              </button>
            </div>
          </div>
        ))
      )}

      <div className="payment-box">
        <h3>Metode Pembayaran</h3>

        <div className="payment-options" style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "12px 0" }}>
          <label
            className="payment-option"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              border: paymentMethod === "tunai" ? "2px solid #4CAF50" : "1px solid #ccc",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: paymentMethod === "tunai" ? "rgba(76, 175, 80, 0.05)" : "transparent",
              transition: "all 0.2s"
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="tunai"
              checked={paymentMethod === "tunai"}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ transform: "scale(1.2)", margin: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: "15px", display: "block" }}>Tunai / COD</strong>
              <small style={{ color: "#666", fontSize: "13px" }}>Bayar saat barang diterima.</small>
            </div>
          </label>

          <label
            className="payment-option"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              border: paymentMethod === "qris" ? "2px solid #4CAF50" : "1px solid #ccc",
              borderRadius: "8px",
              cursor: !qrisImage ? "not-allowed" : "pointer",
              opacity: !qrisImage ? 0.6 : 1,
              backgroundColor: paymentMethod === "qris" ? "rgba(76, 175, 80, 0.05)" : "transparent",
              transition: "all 0.2s"
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="qris"
              checked={paymentMethod === "qris"}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={!qrisImage}
              style={{ transform: "scale(1.2)", margin: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: "15px", display: "block" }}>QRIS {qrisImage ? "" : "(Admin Belum Upload)"}</strong>
              <small style={{ color: "#666", fontSize: "13px" }}>Bayar praktis pakai e-Wallet / M-Banking.</small>
            </div>
          </label>
        </div>

        {paymentMethod === "qris" && qrisImage ? (
          <div className="qris-mini-preview" style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f9f9f9", border: "1px dashed #ccc", borderRadius: "8px", textAlign: "center" }}>
            <span style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "bold", color: "#333" }}>Preview QRIS Anda:</span>
            <img src={qrisImage} alt="QRIS" style={{ maxWidth: "120px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
          </div>
        ) : null}

        {paymentMethod === "qris" && !qrisImage ? (
          <div className="qris-warning" style={{ marginTop: "10px", color: "#d9534f", fontSize: "14px", fontWeight: "bold" }}>
            ⚠️ QRIS belum diupload admin.
          </div>
        ) : null}
      </div>

      <h3>Total: {formatRupiah(total)}</h3>

      <button onClick={checkout} disabled={isCheckingOut}>
        {isCheckingOut ? "Memproses..." : "Kirim Struk ke WhatsApp"}
      </button>
      <button className="secondary" onClick={handlePrint} disabled={isCheckingOut}>
        Preview / Cetak Struk
      </button>
      <button className="danger" onClick={() => setCart([])} disabled={isCheckingOut}>
        Kosongkan
      </button>
    </div>
  );
}
