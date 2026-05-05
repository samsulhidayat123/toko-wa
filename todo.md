# TODO

Dicek pada 2026-05-05.

## Perlu Diperbaiki

Tidak ada item tersisa dari pengecekan terakhir.

## Sudah Dicek

- [x] `pnpm.cmd run lint` berhasil.
- [x] `pnpm run build` berhasil.
- [x] Link WhatsApp sekarang memakai konstanta `WA_NUMBER`.
- [x] Pencarian produk tidak crash saat data spreadsheet punya kolom nama/deskripsi kosong.
- [x] Produk tanpa gambar memakai gambar default saat ditampilkan atau disimpan.
- [x] Invoice preview/cetak dibuat saat tombol preview ditekan.
- [x] QRIS diupload ke ImgBB lalu URL-nya disimpan di Spreadsheet API sebagai setting pusat, sehingga customer dari perangkat lain bisa memakai QRIS yang sama.
- [x] Keranjang dibatasi berdasarkan stok: produk habis tidak bisa dibeli, dan qty tidak bisa melebihi stok.
- [x] Checkout WhatsApp mengurangi stok di spreadsheet terlebih dahulu, lalu membuka WhatsApp dan mengosongkan cart.
- [x] Preview/cetak struk tidak mengurangi stok karena belum dianggap checkout selesai.
- [x] Login admin bisa dikonfigurasi lewat `.env`, sesi admin punya masa berlaku, dan akun demo hanya ditampilkan saat fallback demo dipakai.
- [x] Akun admin dibaca dari Spreadsheet API lewat baris setting `__app_admin_account__`; jika belum ada, baris dibuat otomatis saat login pertama.
- [x] File halaman lama `src/pages/AdminPages.jsx` dan `src/pages/CustomerPages.jsx` sudah dihapus.
- [x] Uji live non-destruktif Sheet.best berhasil: GET spreadsheet merespons HTTP 200.
- [x] Uji live non-upload ImgBB berhasil: endpoint merespons HTTP 400 karena tidak ada file, artinya endpoint/key terjangkau tanpa membuat upload baru.
