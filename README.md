# Toko Qonita - Web Olshop Checkout WhatsApp

Web toko online sederhana berbasis React + Vite untuk menampilkan katalog produk, menerima data customer, membuat struk belanja, dan mengirim order ke WhatsApp. Admin dapat mengelola produk, stok, gambar produk, QRIS, dan data contoh melalui halaman admin.

## Fitur Utama

- Katalog produk untuk customer dengan pencarian dan filter kategori.
- Keranjang belanja dengan validasi stok.
- Checkout ke WhatsApp dengan format struk otomatis.
- Preview dan cetak struk tanpa mengurangi stok.
- Pembayaran Tunai/COD dan QRIS.
- Admin login dengan sesi 12 jam.
- CRUD produk via Spreadsheet API.
- Upload gambar produk dan QRIS ke ImgBB.
- QRIS disimpan sebagai setting pusat di spreadsheet, bukan hanya di browser admin.
- Stok otomatis berkurang setelah checkout WhatsApp berhasil diproses.
- Reset produk contoh tanpa menghapus setting QRIS/admin.

## Teknologi

- React 19
- Vite
- Sheet.best / Spreadsheet API sebagai database produk dan setting aplikasi
- ImgBB sebagai hosting gambar produk dan QRIS
- WhatsApp `wa.me` sebagai tujuan checkout

## Struktur Penting

- `src/pages/CustomerPage.jsx`: halaman customer, katalog, cart, checkout.
- `src/pages/AdminPage.jsx`: halaman admin untuk produk dan QRIS.
- `src/components/AdminLogin.jsx`: form login admin.
- `src/components/CartBox.jsx`: keranjang, pembayaran, checkout.
- `src/components/ReceiptModal.jsx`: preview/cetak struk.
- `src/utils/api.js`: konfigurasi Spreadsheet API, ImgBB, QRIS, stok.
- `src/utils/adminAuth.js`: login admin berbasis baris setting di spreadsheet.
- `src/utils/whatsapp.js`: nomor admin dan format struk WhatsApp.

## Setup Environment

Buat file `.env` di root project. Contoh sudah tersedia di `.env.example`.

```env
VITE_SPREADSHEET_API_URL=https://api.sheetbest.com/sheets/your-sheet-id
VITE_IMGBB_API_KEY=your-imgbb-api-key

VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=change-this-password
```

Keterangan:

- `VITE_SPREADSHEET_API_URL`: URL API dari Sheet.best.
- `VITE_IMGBB_API_KEY`: API key ImgBB untuk upload gambar produk dan QRIS.
- `VITE_ADMIN_USERNAME`: fallback username untuk membuat akun admin pertama kali di spreadsheet.
- `VITE_ADMIN_PASSWORD`: fallback password untuk membuat akun admin pertama kali di spreadsheet.

## Setup Spreadsheet

Buat Google Sheet lalu isi baris pertama dengan header berikut:

```text
id, name, category, price, oldPrice, stock, tag, description, image
```

Hubungkan sheet tersebut ke Sheet.best, lalu salin URL API ke `VITE_SPREADSHEET_API_URL`.

Baris produk memakai kolom:

- `id`: ID unik produk.
- `name`: nama produk.
- `category`: kategori produk.
- `price`: harga jual.
- `oldPrice`: harga coret, boleh kosong.
- `stock`: stok produk.
- `tag`: label produk, misalnya Promo atau Ready.
- `description`: deskripsi produk.
- `image`: URL gambar produk.

## Baris Setting Otomatis

Aplikasi membuat baris khusus di spreadsheet untuk setting global. Baris ini disembunyikan dari daftar produk dan tidak ikut dihapus saat reset produk contoh.

```text
__app_qris_settings__
```

Dipakai untuk menyimpan URL QRIS hasil upload ImgBB. URL QRIS tersimpan di kolom `image`.

```text
__app_admin_account__
```

Dipakai untuk menyimpan akun admin:

- Kolom `name`: username admin.
- Kolom `description`: password admin.

Jika baris admin belum ada, aplikasi akan membuatnya saat login pertama memakai nilai fallback dari `.env`.

## Alur Customer

1. Customer memilih produk dari katalog.
2. Produk habis tidak bisa dibeli.
3. Jumlah item di keranjang tidak bisa melebihi stok.
4. Customer mengisi nama, nomor HP, dan alamat.
5. Customer memilih metode pembayaran.
6. Saat klik `Kirim Struk ke WhatsApp`, aplikasi mengurangi stok di spreadsheet.
7. Setelah stok berhasil dikurangi, WhatsApp terbuka dengan struk otomatis.
8. Cart dikosongkan setelah checkout berhasil.

Preview/cetak struk hanya untuk melihat atau mencetak struk, dan tidak mengurangi stok.

## Alur Admin

1. Admin login.
2. Admin dapat menambah, mengedit, dan menghapus produk.
3. Admin dapat upload gambar produk ke ImgBB.
4. Admin dapat upload atau hapus QRIS.
5. Admin dapat reset produk ke data contoh.

Reset produk contoh hanya mengganti baris produk. Baris setting QRIS dan admin tetap dipertahankan.

## Menjalankan Project

Install dependency:

```bash
npm install
```

Jalankan mode development:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```
