# Cloudflare Worker API

Worker ini dibuat kompatibel dengan pola API Sheetbest yang dipakai frontend sekarang.

Artinya frontend tidak perlu langsung diganti besar-besaran. Setelah Worker deploy, cukup ganti GitHub Secret:

```txt
VITE_SPREADSHEET_API_URL=https://toko-wa-api.username.workers.dev
```

`DATABASE_URL` Neon hanya disimpan sebagai secret Worker, jangan dimasukkan ke GitHub Pages.

## Setup

```bash
cd worker
npm install
npx wrangler login
```

Set secret Neon:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
```

Saat diminta, paste connection string Neon. `ADMIN_USERNAME` dan `ADMIN_PASSWORD`
dipakai untuk membuat akun admin pertama di database (dihash server-side, tidak
boleh bocor). Jika akun admin sudah ada di database, secret ini tidak digunakan.

Deploy:

```bash
npm run deploy
```

## Endpoint

Endpoint dibuat meniru Sheetbest:

```txt
GET    /
GET    /id/:id
POST   /
PUT    /id/:id
DELETE /id/:id
DELETE /:index
```

Semua endpoint tulis (`POST /`, `PUT`, `DELETE`) wajib header
`Authorization: Bearer <token>` dari login admin.

Endpoint autentikasi:

```txt
POST /login
```

Body: `{"username": "...", "password": "..."}`
Response: `{"token": "...", "expiresAt": 1234567890000}` (berlaku 12 jam).
Token disimpan di tabel `sessions` dan dibersihkan otomatis saat kedaluwarsa.

Endpoint checkout customer (kurangi stok atomik di server, tanpa token):

```txt
POST /checkout
```

Body: `{"items": [{"id": "...", "qty": 2}]}`
Response: `{"message": "Stok berhasil dikurangi.", "products": [...]}`
Stok dikurangi dengan SQL atomik `UPDATE ... WHERE stock >= qty`, jadi aman
dari race condition dan tidak bisa negatif.

Endpoint share produk:

```txt
GET /share/:id
```

Endpoint ini mengembalikan HTML kecil berisi Open Graph meta tag agar saat link produk dibagikan ke WhatsApp/Telegram/Facebook, preview bisa menampilkan nama, deskripsi, harga, dan foto produk.

## Test

```bash
curl https://toko-wa-api.username.workers.dev/
```

Harus mengembalikan array berisi setting dan produk.
