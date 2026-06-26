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
```

Saat diminta, paste connection string Neon baru.

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
