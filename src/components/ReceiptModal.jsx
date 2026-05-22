import { formatRupiah } from "../utils/format";

export default function ReceiptModal({
  show,
  setShow,
  cart,
  customer,
  invoice,
  paymentMethod,
  qrisImage,
}) {
  if (!show) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paymentLabel = paymentMethod === "qris" ? "QRIS" : "Tunai / COD";

  return (
    <div className="modal">
      <div className="receipt" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <h2>Toserba Qonita</h2>
        <p>Struk Belanja</p>
        <p>{invoice}</p>
        <hr />

        <p>Nama: {customer.name}</p>
        <p>No HP: {customer.phone}</p>
        <p>Alamat: {customer.address}</p>
        <p>Bayar: {paymentLabel}</p>

        <hr />

        {cart.map((item) => (
          <div key={item.id} className="receipt-row">
            <span>
              {item.name} x {item.qty}
            </span>
            <strong>{formatRupiah(item.price * item.qty)}</strong>
          </div>
        ))}

        <hr />

        <div className="receipt-row total">
          <span>Total</span>
          <strong>{formatRupiah(total)}</strong>
        </div>

        {paymentMethod === "qris" && qrisImage ? (
          <div className="receipt-qris" style={{ textAlign: "center", marginTop: "20px" }}>
            <hr style={{ borderTop: "1px dashed #ccc", marginBottom: "15px" }} />
            <h3 style={{ marginBottom: "10px", fontSize: "16px", color: "#333" }}>Scan QRIS</h3>
            <img src={qrisImage} alt="QRIS Pembayaran" style={{ maxWidth: "200px", width: "100%", height: "auto", borderRadius: "8px", border: "1px solid #ddd", padding: "5px", backgroundColor: "#fff" }} />
            <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>Silakan scan QRIS untuk pembayaran.</p>
          </div>
        ) : null}

        <div className="modal-actions">
          <button onClick={() => window.print()}>Print</button>
          <button className="secondary" onClick={() => setShow(false)}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
