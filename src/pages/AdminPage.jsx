import { useState } from "react";
import { formatRupiah } from "../utils/format";
import { useNotification } from "../utils/notification";
import { defaultProducts } from "../data/defaultProducts";
import {
  DEFAULT_PRODUCT_IMAGE,
  SPREADSHEET_API_URL,
  getDirectImgBbImageUrl,
  getValidImageUrl,
  isAppSettingsRow,
  isSpreadsheetApiConfigured,
  saveQrisImageToSpreadsheet,
  uploadImageToImgBB,
} from "../utils/api";

const emptyForm = {
  id: "",
  name: "",
  category: "",
  price: "",
  oldPrice: "",
  stock: "",
  tag: "",
  description: "",
  image: "",
};

export default function AdminPage({
  products,
  setProducts,
  setCart,
  qrisImage,
  setQrisImage,
  fetchProducts,
  isLoading,
  error,
}) {
  const { confirm, notify } = useNotification();
  const [form, setForm] = useState(emptyForm);
  const [keyword, setKeyword] = useState("");
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingQrisImage, setIsUploadingQrisImage] = useState(false);
  const [isResettingProducts, setIsResettingProducts] = useState(false);

  const filteredProducts = products.filter((product) =>
    (product.name || "").toLowerCase().includes(keyword.toLowerCase())
  );

  function buildProductData(source) {
    return {
      ...source,
      name: source.name || "",
      category: source.category || "",
      price: source.price === "" ? "" : Number(source.price),
      oldPrice: source.oldPrice ? Number(source.oldPrice) : "",
      stock: source.stock === "" ? "" : Number(source.stock),
      tag: source.tag || "Ready",
      description: source.description || "",
      image: getValidImageUrl(source.image),
    };
  }

  async function saveProductImageToRow(productId, imageUrl) {
    const selectedProduct = products.find((product) => product.id === productId);
    if (!selectedProduct) return;

    const updatedProduct = buildProductData({
      ...selectedProduct,
      image: imageUrl,
    });

    const response = await fetch(`${SPREADSHEET_API_URL}/id/${encodeURIComponent(productId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct),
    });

    if (!response.ok) {
      throw new Error("Gagal menyimpan gambar ke produk.");
    }

    await fetchProducts();
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleProductImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.warning("File harus berupa gambar.");
      return;
    }

    setIsUploadingProductImage(true);
    try {
      const imageUrl = await uploadImageToImgBB(file);
      const directImageUrl = getDirectImgBbImageUrl(imageUrl);

      if (!directImageUrl) {
        throw new Error("URL gambar dari ImgBB tidak valid.");
      }

      setForm((prevForm) => ({ ...prevForm, image: directImageUrl }));

      if (form.id && isSpreadsheetApiConfigured()) {
        await saveProductImageToRow(form.id, directImageUrl);
        notify.success("Gambar produk berhasil diunggah dan disimpan.");
      } else {
        notify.success("Gambar produk berhasil diunggah. Simpan produk agar gambar menempel.");
      }
    } catch (err) {
      notify.error(`Gagal mengunggah gambar produk: ${err.message}`);
    } finally {
      setIsUploadingProductImage(false);
    }
  }

  async function handleQrisUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.warning("File harus berupa gambar.");
      return;
    }

    setIsUploadingQrisImage(true);
    try {
      const imageUrl = await uploadImageToImgBB(file);
      await saveQrisImageToSpreadsheet(imageUrl);
      setQrisImage(imageUrl);
      notify.success("QRIS berhasil diunggah dan disimpan.");
    } catch (err) {
      notify.error(`Gagal mengunggah gambar QRIS: ${err.message}`);
    } finally {
      setIsUploadingQrisImage(false);
    }
  }

  async function removeProductImage() {
    const isConfirmed = await confirm({
      title: "Hapus Gambar",
      message: "Hapus gambar produk?",
      confirmText: "Hapus",
    });
    if (!isConfirmed) return;

    setForm((prevForm) => ({
      ...prevForm,
      image: "",
    }));

    if (form.id && isSpreadsheetApiConfigured()) {
      try {
        await saveProductImageToRow(form.id, "");
        notify.success("Gambar produk berhasil dihapus.");
      } catch (err) {
        notify.error(err.message);
      }
    } else {
      notify.success("Gambar produk berhasil dihapus.");
    }
  }

  async function removeQris() {
    const isConfirmed = await confirm({
      title: "Hapus QRIS",
      message: "Hapus gambar QRIS?",
      confirmText: "Hapus",
    });
    if (!isConfirmed) return;

    setIsUploadingQrisImage(true);
    try {
      await saveQrisImageToSpreadsheet("");
      setQrisImage("");
      notify.success("QRIS berhasil dihapus.");
    } catch (err) {
      notify.error(`Gagal menghapus QRIS: ${err.message}`);
    } finally {
      setIsUploadingQrisImage(false);
    }
  }

  async function saveProduct(e) {
    e.preventDefault();

    if (!isSpreadsheetApiConfigured()) {
      notify.warning("Fitur ini memerlukan koneksi ke Spreadsheet API. Silakan atur URL di src/utils/api.js");
      return;
    }

    if (!form.name || !form.category || !form.price || !form.stock) {
      notify.warning("Nama, kategori, harga, dan stok wajib diisi.");
      return;
    }

    const productData = buildProductData(form);

    if (form.id) {
      // --- UPDATE ---
      try {
        const response = await fetch(`${SPREADSHEET_API_URL}/id/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
        if (!response.ok) throw new Error("Gagal mengupdate produk di database.");

        await fetchProducts();
        notify.success("Produk berhasil diedit.");
      } catch (err) {
        notify.error(err.message);
      }
    } else {
      // --- CREATE ---
      const newProduct = { ...productData, id: crypto.randomUUID() };
      try {
        const response = await fetch(SPREADSHEET_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([newProduct]),
        });
        if (!response.ok) throw new Error("Gagal menambah produk ke database.");

        await fetchProducts();
        notify.success("Produk berhasil ditambahkan.");
      } catch (err) {
        notify.error(err.message);
      }
    }

    setForm(emptyForm);
  }

  function editProduct(product) {
    // Mengisi form dengan data yang lengkap, termasuk yang kosong
    setForm({
      id: product.id || "",
      name: product.name || "",
      category: product.category || "",
      price: product.price || "",
      oldPrice: product.oldPrice || "",
      stock: product.stock || "",
      tag: product.tag || "",
      description: product.description || "",
      image: product.image || "",
      // productImageFile tidak diisi karena ini hanya untuk upload baru
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteProduct(id) {
    const selected = products.find((product) => product.id === id);
    const isConfirmed = await confirm({
      title: "Hapus Produk",
      message: `Hapus produk "${selected?.name}"?`,
      confirmText: "Hapus",
    });
    if (!isConfirmed) return;

    if (!isSpreadsheetApiConfigured()) {
      notify.warning("Fitur ini memerlukan koneksi ke Spreadsheet API. Silakan atur URL di src/utils/api.js");
      return;
    }

    // --- DELETE ---
    try {
      const response = await fetch(`${SPREADSHEET_API_URL}/id/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Gagal menghapus produk dari database.");

      setProducts(products.filter((product) => product.id !== id));
      setCart((cart) => cart.filter((item) => item.id !== id));
      notify.success(`Produk "${selected?.name}" berhasil dihapus.`);
    } catch (err) {
      notify.error(err.message);
    }
  }

  async function resetProducts() {
    const isConfirmed = await confirm({
      title: "Reset Produk",
      message: "Reset produk ke data contoh? Data produk saat ini akan diganti.",
      confirmText: "Reset",
    });
    if (!isConfirmed) return;

    const sampleProducts = defaultProducts.map((product) => ({
      ...product,
      id: crypto.randomUUID(),
    }));

    if (!isSpreadsheetApiConfigured()) {
      setProducts(sampleProducts);
      setCart([]);
      setForm(emptyForm);
      notify.success("Produk berhasil direset ke data contoh.");
      return;
    }

    setIsResettingProducts(true);
    try {
      const response = await fetch(SPREADSHEET_API_URL);
      if (!response.ok) throw new Error("Gagal mengambil data produk dari database.");

      const currentProducts = await response.json();
      const productRows = currentProducts
        .map((product, index) => ({ product, index }))
        .filter(({ product }) => !isAppSettingsRow(product));

      for (let row = productRows.length - 1; row >= 0; row -= 1) {
        const index = productRows[row].index;
        const deleteResponse = await fetch(`${SPREADSHEET_API_URL}/${index}`, {
          method: "DELETE",
        });

        if (!deleteResponse.ok) {
          throw new Error("Gagal menghapus produk lama dari database.");
        }
      }

      const createResponse = await fetch(SPREADSHEET_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleProducts),
      });

      if (!createResponse.ok) {
        throw new Error("Gagal mengisi ulang produk contoh ke database.");
      }

      setProducts(sampleProducts);
      setCart([]);
      setForm(emptyForm);
      notify.success("Produk berhasil direset ke data contoh.");
      await fetchProducts();
    } catch (err) {
      notify.error(`Gagal reset produk contoh: ${err.message}`);
    } finally {
      setIsResettingProducts(false);
    }
  }

  return (
    <main>
      <section>
        <div className="admin-title">
          <div>
            <h1>Admin Produk</h1>
            <p>Kelola produk, stok, harga, dan QRIS pembayaran.</p>
          </div>

          <button className="secondary" onClick={resetProducts} disabled={isResettingProducts}>
            {isResettingProducts ? "Mereset..." : "Reset Produk Contoh"}
          </button>
        </div>

        <div className="admin-stats">
          <div>
            <strong>{products.length}</strong>
            <span>Total Produk</span>
          </div>
          <div>
            <strong>
              {products.reduce((sum, product) => sum + Number(product.stock || 0), 0)}
            </strong>
            <span>Total Stok</span>
          </div>
          <div>
            <strong>{qrisImage ? "Aktif" : "Belum"}</strong>
            <span>Status QRIS</span>
          </div>
        </div>

        <div className="qris-admin-card">
          <div>
            <h2>QRIS Pembayaran</h2>
            <p>
              Upload gambar QRIS agar customer bisa memilih pembayaran QRIS dan
              QRIS muncul di struk.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleQrisUpload}
              disabled={isUploadingQrisImage} />

            <div className="qris-admin-actions">
              {qrisImage ? (
                <button className="danger" onClick={removeQris}>
                  Hapus QRIS
                </button>
              ) : null}
              {isUploadingQrisImage && <small>Mengunggah QRIS...</small>}
            </div>
          </div>

          <div className="qris-preview-box">
            {qrisImage ? (
              <img src={qrisImage} alt="QRIS Admin" />
            ) : isUploadingQrisImage ? (
              <span>Mengunggah...</span>
            ) : (
              <span>Belum ada QRIS</span>
            )}
          </div>
        </div>

        <div className="admin-grid">
          <form className="panel" onSubmit={saveProduct}>
            <h2>{form.id ? "Edit Produk" : "Tambah Produk"}</h2>

            <label>Nama Produk</label>
            <input
              name="name"
              placeholder="Contoh: Es Lumut Coklat"
              value={form.name}
              onChange={handleChange}
            />

            <label>Kategori</label>
            <input
              name="category"
              placeholder="Contoh: Minuman"
              value={form.category}
              onChange={handleChange}
            />

            <label>Harga Jual</label>
            <input
              name="price"
              type="number"
              placeholder="Contoh: 7000"
              value={form.price}
              onChange={handleChange}
            />

            <label>Harga Coret</label>
            <input
              name="oldPrice"
              type="number"
              placeholder="Opsional, contoh: 10000"
              value={form.oldPrice}
              onChange={handleChange}
            />

            <label>Stok</label>
            <input
              name="stock"
              type="number"
              placeholder="Contoh: 20"
              value={form.stock}
              onChange={handleChange}
            />

            <label>Label Produk</label>
            <input
              name="tag"
              placeholder="Contoh: Promo, New, Best Seller"
              value={form.tag}
              onChange={handleChange}
            />

            <label>Gambar Produk</label>
            <div className="image-upload-preview">
              <input
                type="file"
                accept="image/*"
                onChange={handleProductImageUpload}
                disabled={isUploadingProductImage}
              />
              {isUploadingProductImage && <small>Mengunggah gambar...</small>}
              {form.image && (
                <div className="image-preview-box">
                  <img src={form.image} alt="Preview Produk" />
                  <button
                    type="button"
                    className="danger small"
                    onClick={removeProductImage}
                    disabled={isUploadingProductImage}
                  >
                    Hapus Gambar
                  </button>
                </div>
              )}
              {!form.image && !isUploadingProductImage && <span>Belum ada gambar</span>}
            </div>


            <label>Deskripsi</label>
            <textarea
              name="description"
              placeholder="Tulis deskripsi produk"
              value={form.description}
              onChange={handleChange}
            />

            <div className="form-actions">
              <button type="submit">
                {form.id ? "Simpan Perubahan" : "Tambah Produk"}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => setForm(emptyForm)}
              >
                Batal
              </button>
            </div>
          </form>

          <div className="panel">
            <div className="table-header">
              <div>
                <h2>Daftar Produk</h2>
                <p>Produk ini muncul di halaman belanja customer.</p>
              </div>

              <input
                className="admin-search"
                placeholder="Cari produk..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Label</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6">Memuat produk...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" style={{ color: "red" }}>{error}</td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6">Produk tidak ditemukan.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="admin-product-info">
                            <img
                              src={product.image || DEFAULT_PRODUCT_IMAGE}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                              }}
                            />
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.description}</small>
                            </div>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td>
                          <strong>{formatRupiah(product.price)}</strong>
                          {product.oldPrice ? (
                            <small>
                              <del>{formatRupiah(product.oldPrice)}</del>
                            </small>
                          ) : null}
                        </td>
                        <td>{product.stock}</td>
                        <td>{product.tag || "Ready"}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => editProduct(product)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() => deleteProduct(product.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
