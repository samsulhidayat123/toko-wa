import { formatRupiah } from "./format";

export const CLEANTER_BRIDGE_URL = "http://localhost:9100";

export async function isCleanterAvailable() {
  try {
    const res = await fetch(`${CLEANTER_BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { available: false, printer: null };
    const data = await res.json();
    return { available: true, printer: data.printer || null };
  } catch {
    return { available: false, printer: null };
  }
}

export function buildCleanterReceiptContent({ cart, customer, invoice, paymentMethod, qrisImage }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const paymentLabel = paymentMethod === "qris" ? "QRIS" : "Tunai / COD";
  const content = [];

  content.push({ type: "text", text: "Toserba Qonita", align: "center", bold: true, size: "large" });
  content.push({ type: "text", text: "Struk Belanja", align: "center" });
  content.push({ type: "text", text: invoice, align: "center" });
  content.push({ type: "divider" });
  content.push({ type: "row", left: "Nama", right: customer.name || "-" });
  content.push({ type: "row", left: "No HP", right: customer.phone || "-" });
  if (customer.address) content.push({ type: "row", left: "Alamat", right: customer.address });
  content.push({ type: "row", left: "Bayar", right: paymentLabel });
  content.push({ type: "divider" });

  cart.forEach((item) => {
    content.push({
      type: "row",
      left: `${item.name} x${item.qty}`,
      right: formatRupiah(item.price * item.qty),
    });
  });

  content.push({ type: "divider" });
  content.push({ type: "row", left: "TOTAL", right: formatRupiah(total), bold: true });

  if (paymentMethod === "qris" && qrisImage) {
    const base64 = qrisImage.startsWith("data:image/")
      ? qrisImage.split(",")[1]
      : qrisImage;
    content.push({ type: "feed", lines: 1 });
    content.push({ type: "image", base64, align: "center", dither: false });
    content.push({ type: "text", text: "Scan QRIS untuk pembayaran", align: "center" });
  }

  content.push({ type: "feed", lines: 3 });
  return content;
}

export async function printViaCleanter({ content, paperWidth, reference }) {
  const res = await fetch(`${CLEANTER_BRIDGE_URL}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cut: true, content, paperWidth, reference }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.fix || err.detail || `Gagal cetak (${res.status})`);
  }
  return res.json();
}