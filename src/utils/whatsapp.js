import { formatRupiah } from "./format";

// GANTI NOMOR DI BAWAH INI DENGAN NOMOR WA ADMIN (Nomormu)
// Gunakan kode negara 62, tanpa tanda + atau angka 0 di depan (contoh: "6281299998888")
export const WA_NUMBER = "6287717309901";

export function buildWhatsAppReceipt(cart, customer, paymentMethod = "tunai") {
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
