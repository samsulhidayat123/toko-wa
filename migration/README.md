# Migrasi Sheetbest ke Neon

Folder ini hanya untuk memindahkan data lama dari Sheetbest ke Neon. Ini tidak mengubah frontend GitHub Pages dan tidak mengubah cara website live berjalan.

## Yang Disiapkan di Neon

1. Buat project Neon.
2. Buka dashboard project Neon.
3. Copy connection string Postgres.
4. Pakai connection string yang formatnya seperti ini:

```txt
postgresql://user:password@host/database?sslmode=require
```

Tabel akan dibuat otomatis oleh script:

- `products`
- `app_settings`

## Jalankan Migrasi

Masuk ke folder ini:

```powershell
cd migration
npm install
```

Test baca data Sheetbest tanpa menulis ke Neon:

```powershell
$env:SHEETBEST_API_URL="https://api.sheetbest.com/sheets/id-sheetbest-kamu"
$env:DATABASE_URL="postgresql://..."
npm run migrate:neon -- --dry-run
```

Migrasi ke Neon:

```powershell
npm run migrate:neon
```

Mode default adalah upsert. Artinya data dengan `id` yang sama akan diperbarui, data lain tidak dihapus.

Kalau ingin isi tabel produk Neon diganti total dengan isi Sheetbest:

```powershell
npm run migrate:neon -- --replace-products
```

## Data yang Dipindahkan

Produk masuk ke tabel `products`.

Row setting ini masuk ke tabel `app_settings`:

- `__app_qris_settings__`
- `__app_admin_account__`

Jangan hapus Sheetbest dulu sebelum hasil di Neon dicek.
