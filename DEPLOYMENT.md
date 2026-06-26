# Panduan Deployment Production

Panduan lengkap untuk deploy aplikasi ke production dengan Cloudflare Worker + Neon Database.

## Prasyarat

- Akun Cloudflare dengan Workers
- Akun Neon PostgreSQL  
- Akun GitHub (sudah ada)
- Akun ImgBB

## Tahap 1: Setup Database Neon

1. Buat project baru di [Neon Console](https://console.neon.tech)
2. Ambil connection string dari dashboard (format: `postgresql://...`)
3. Simpan connection string untuk tahap berikutnya

## Tahap 2: Deploy Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login
```

Set Database secret:

```bash
npx wrangler secret put DATABASE_URL
```

Paste connection string Neon saat diminta.

Deploy:

```bash
npm run deploy
```

Catat URL yang muncul:
```
Deployed to https://toko-wa-api.your-account.workers.dev
```

## Tahap 3: Migrasi Data dari Sheet.best ke Neon (jika ada data lama)

```bash
cd migration
npm install

# Set environment variables
$env:DATABASE_URL = "postgresql://..."
$env:SHEETBEST_API_URL = "https://api.sheetbest.com/sheets/id-kamu"

# Test dry-run terlebih dahulu
npm run migrate:neon -- --dry-run

# Jalankan migrasi
npm run migrate:neon
```

## Tahap 4: Setup GitHub Secrets

Buka GitHub repository settings → Secrets and variables → Actions

Tambahkan secrets berikut:

| Secret Name | Value |
|---|---|
| `VITE_SPREADSHEET_API_URL` | `https://toko-wa-api.your-account.workers.dev` |
| `VITE_IMGBB_API_KEY` | ImgBB API key |
| `VITE_ADMIN_USERNAME` | Username admin |
| `VITE_ADMIN_PASSWORD` | Password admin (kuat!) |
| `VITE_WA_NUMBER` | Nomor WhatsApp tujuan (format: 628xxx...) |

## Tahap 5: Update Production .env

File `.env` lokal (untuk development):

```
VITE_SPREADSHEET_API_URL=https://toko-wa-api.your-account.workers.dev
VITE_IMGBB_API_KEY=your-api-key
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=admin123
VITE_WA_NUMBER=628xxx
```

Jangan push `.env` ke GitHub (sudah di `.gitignore`).

## Tahap 6: Deploy Frontend ke GitHub Pages

Push ke branch `main`:

```bash
git push
```

GitHub Actions akan otomatis:
1. Build aplikasi dengan secrets dari GitHub
2. Deploy ke GitHub Pages

Setelah build selesai, aplikasi live di: `https://toserbaqonita.my.id`

## Tahap 7: Test Production

1. Buka website: https://toserbaqonita.my.id
2. Check apakah produk muncul dari database Neon
3. Test admin login
4. Test upload gambar produk
5. Test upload QRIS
6. Test share produk (Open Graph tags)

## Troubleshooting

### Gambar produk tidak muncul

1. Check CORS headers di Worker:
   ```bash
   curl -H "Origin: https://toserbaqonita.my.id" https://toko-wa-api.your-account.workers.dev/
   ```

2. Pastikan `ALLOWED_ORIGIN` di `worker/wrangler.toml` benar

### Produk tidak muncul

1. Check database Neon apakah ada data:
   ```bash
   psql CONNECTION_STRING -c "SELECT COUNT(*) FROM products"
   ```

2. Check network tab di browser untuk error API

### Admin tidak bisa login

1. Check database:
   ```bash
   psql CONNECTION_STRING -c "SELECT * FROM app_settings WHERE id='__app_admin_account__'"
   ```

2. Jika tidak ada, buat manual melalui admin panel

## Maintenance

### Update produk

Admin panel tersedia di `/admin` - login untuk manage produk, stok, dan QRIS.

### Backup database

```bash
pg_dump CONNECTION_STRING > backup.sql
```

### Monitor Worker

Lihat logs di Cloudflare Dashboard → Workers → toko-wa-api → Logs
