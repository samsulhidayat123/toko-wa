import { formatRupiah } from "./format";

// Nomor WA toko diambil dari environment variable.
// Set VITE_WA_NUMBER di .env (lokal) dan di hosting (Vercel/Netlify env vars).
// Format: kode negara 62, tanpa "+" atau "0" depan. Contoh: "6281234567890".
const WA_NUMBER_FROM_ENV = import.meta.env.VITE_WA_NUMBER?.trim();

export const WA_NUMBER = WA_NUMBER_FROM_ENV || "";

export function isWaNumberConfigured() {
  return /^[1-9]\d{7,14}$/.test(WA_NUMBER);
}

export function buildWhatsAppReceipt(cart, customer, paymentMethod = "tunai") {
  if (!isWaNumberConfigured()) {
    throw new Error(
      "VITE_WA_NUMBER belum diatur dengan benar. Tambahkan di .env, contoh: VITE_WA_NUMBER=6281234567890"
    );
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const invoice = "INV-" + Date.now();

  const paymentLabel = paymentMethod === "qris" ? "QRIS" : "Tunai / COD";

  let message = `*TOKO QONITA*\n`;
  message += `*STRUK BELANJA*\n`;
  message += `No: ${invoice}\n`;
  message += `==============================\n`;
  message += `*DATA CUSTOMER*\n`;
  message += `Nama: ${customer.name}\n`;
  message += `No HP: ${customer.phone}\n`;
  message += `Alamat: ${customer.address}\n`;
  message += `Catatan: ${customer.note || "-"}\n`;
  message += `==============================\n`;
  message += `*DETAIL PESANAN*\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `${item.qty} x ${formatRupiah(item.price)} = ${formatRupiah(
      item.price * item.qty
    )}\n`;
  });

  message += `==============================\n`;
  message += `Total Item: ${totalQty}\n`;
  message += `*Total Bayar: ${formatRupiah(total)}*\n`;
  message += `Metode Bayar: ${paymentLabel}\n`;

  if (paymentMethod === "qris") {
    message += `\nCustomer memilih pembayaran QRIS.\n`;
    message += `Silakan kirim QRIS atau arahkan customer melihat QRIS pada struk web.\n`;
  }

  message += `==============================\n`;
  message += `TERIMA KASIH`;

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}
