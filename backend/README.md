# Backend Upload ImgBB

Backend kecil ini dipakai supaya `IMGBB_API_KEY` tidak lagi ditaruh di frontend GitHub Pages.

Alur aman:

```txt
Frontend GitHub Pages -> backend Vercel -> ImgBB
```

## Endpoint

```txt
POST /api/upload-image
```

Body harus `multipart/form-data` dengan field:

```txt
image=<file gambar>
```

Response berhasil:

```json
{
  "url": "https://i.ibb.co/...",
  "displayUrl": "https://i.ibb.co/...",
  "deleteUrl": "https://ibb.co/..."
}
```

## Environment Variable

Atur di Vercel Project Settings -> Environment Variables:

```txt
IMGBB_API_KEY=api_key_imgbb_kamu
ALLOWED_ORIGIN=https://username.github.io
UPLOAD_TOKEN=token_panjang_acak
```

Catatan:

- `IMGBB_API_KEY` hanya boleh ada di backend.
- Jangan pakai nama `VITE_IMGBB_API_KEY` untuk backend.
- `ALLOWED_ORIGIN` isi dengan domain GitHub Pages kamu.
- `UPLOAD_TOKEN` menambah proteksi endpoint. Jangan hardcode token ini di file frontend publik.

## Deploy ke Vercel

Masuk ke folder backend:

```bash
cd backend
npm install
npm run deploy
```

Setelah deploy, endpoint akan menjadi:

```txt
https://nama-project.vercel.app/api/upload-image
```

## Test Lokal

```bash
cd backend
npm install
npm run dev
```

Endpoint lokal:

```txt
http://localhost:3000/api/upload-image
```

## Integrasi Frontend Nanti

Frontend cukup upload ke endpoint backend:

```js
const formData = new FormData();
formData.append("image", file);

const response = await fetch("https://nama-project.vercel.app/api/upload-image", {
  method: "POST",
  headers: {
    "x-upload-token": tokenAdmin,
  },
  body: formData,
});

const result = await response.json();
```

URL gambar yang disimpan ke spreadsheet adalah `result.url`.
