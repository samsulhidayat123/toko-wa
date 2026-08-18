import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatRupiah } from "../utils/format";
import {
  buildCleanterReceiptContent,
  isCleanterAvailable,
  printViaCleanter,
} from "../utils/cleanter";

export default function ReceiptModal({
  show,
  setShow,
  cart,
  customer,
  invoice,
  paymentMethod,
  qrisImage,
  receiptSettings,
}) {
  const [cleanterState, setCleanterState] = useState({
    status: "idle", // idle | checking | available | unavailable
    printer: null,
  });
  const [printState, setPrintState] = useState({
    status: "idle", // idle | printing | ok | error
    message: "",
  });
  // Terapkan ukuran kertas struk saat mencetak via @page di print CSS
  const paperSize = receiptSettings?.paperSize === "58" ? "58" : "80";
  const compact = Boolean(receiptSettings?.compact);

  useEffect(() => {
    if (!show) return undefined;

    const style = document.createElement("style");
    style.setAttribute("data-receipt-page", "1");
    style.textContent = `@media print { @page { size: ${paperSize}mm 297mm; margin: 0; } }`;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [show, paperSize]);

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    isCleanterAvailable().then(({ available, printer }) => {
      if (cancelled) return;
      setCleanterState({ status: available ? "available" : "unavailable", printer });
      setPrintState({ status: "idle", message: "" });
    });

    return () => {
      cancelled = true;
    };
  }, [show]);

  async function handleBluetoothPrint() {
    setPrintState({ status: "printing", message: "" });
    try {
      await printViaCleanter({
        content: buildCleanterReceiptContent({
          cart,
          customer,
          invoice,
          paymentMethod,
          qrisImage,
        }),
        paperWidth: Number(paperSize),
        reference: invoice,
      });
      setPrintState({ status: "ok", message: "Struk terkirim ke printer Bluetooth." });
    } catch (err) {
      setPrintState({ status: "error", message: err.message });
    }
  }

  if (!show) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paymentLabel = paymentMethod === "qris" ? "QRIS" : "Tunai / COD";
  const receiptClass = ["receipt", `paper-${paperSize}`, compact ? "compact" : ""]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="modal">
      <div className={receiptClass} style={{ maxHeight: "90vh", overflowY: "auto" }}>
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
          <button
            onClick={handleBluetoothPrint}
            disabled={printState.status === "printing" || cleanterState.status === "checking"}
          >
            {cleanterState.status === "checking"
              ? "Cek printer..."
              : printState.status === "printing"
              ? "Mencetak..."
              : "Cetak Bluetooth (HP)"}
          </button>
          <button className="secondary" onClick={() => window.print()}>
            Print Kertas
          </button>
          <button className="secondary" onClick={() => setShow(false)}>
            Tutup
          </button>
        </div>
        {printState.status === "error" && (
          <p className="cleanter-status warn">{printState.message}</p>
        )}

        {cleanterState.status === "available" && cleanterState.printer?.connected && (
          <p className="cleanter-status ok">Printer: {cleanterState.printer.name}</p>
        )}
        {cleanterState.status === "available" && !cleanterState.printer?.connected && (
          <p className="cleanter-status warn">
            Printer belum terhubung. Buka aplikasi Cleanter dan pilih printer kamu.
          </p>
        )}
        {printState.status === "ok" && (
          <p className="cleanter-status ok">{printState.message}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
