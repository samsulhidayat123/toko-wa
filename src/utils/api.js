// Ganti dengan URL koneksi dari sheet.best atau layanan serupa
export const SPREADSHEET_API_URL =
  import.meta.env.VITE_SPREADSHEET_API_URL?.trim() ||
  "https://api.sheetbest.com/sheets/bef38b47-487f-41df-aefa-6eb5b663428c";

// Contoh: "https://sheet.best/api/sheets/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

export function isSpreadsheetApiConfigured() {
  return (
    SPREADSHEET_API_URL.startsWith("http") &&
    !SPREADSHEET_API_URL.includes("xxxxxxxx")
  );
}

export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1556741533-411cf82e4e2d?auto=format&fit=crop&w=900&q=80";

export const QRIS_SETTINGS_ID = "__app_qris_settings__";
export const ADMIN_SETTINGS_ID = "__app_admin_account__";

export function isQrisSettingsRow(row) {
  return row?.id === QRIS_SETTINGS_ID;
}

export function isAdminSettingsRow(row) {
  return row?.id === ADMIN_SETTINGS_ID;
}

export function isAppSettingsRow(row) {
  return isQrisSettingsRow(row) || isAdminSettingsRow(row);
}

export function getQrisImageFromRows(rows) {
  return rows.find(isQrisSettingsRow)?.image || "";
}

export function getDirectImgBbImageUrl(imageUrl) {
  const rawImageUrl = String(imageUrl || "").trim();
  if (!rawImageUrl) return "";

  try {
    const url = new URL(rawImageUrl);
    const host = url.hostname.toLowerCase();
    const isDirectImgBbHost =
      host === "i.ibb.co" ||
      host.endsWith(".i.ibb.co") ||
      host.endsWith(".imgbb.com");

    return isDirectImgBbHost ? rawImageUrl : "";
  } catch {
    return "";
  }
}

export function normalizeProductRow(product) {
  return {
    ...product,
    name: product.name || "",
    category: product.category || "",
    description: product.description || "",
    tag: product.tag || "Ready",
    image: getDirectImgBbImageUrl(product.image),
    price: Number(product.price),
    oldPrice: product.oldPrice ? Number(product.oldPrice) : "",
    stock: Number(product.stock),
  };
}

function buildQrisSettingsRow(imageUrl) {
  return {
    id: QRIS_SETTINGS_ID,
    name: "QRIS Pembayaran",
    category: "__settings__",
    price: "",
    oldPrice: "",
    stock: "",
    tag: "system",
    description: "URL QRIS yang diupload ke ImgBB",
    image: imageUrl,
  };
}

async function hasQrisSettingsRow() {
  const response = await fetch(`${SPREADSHEET_API_URL}/id/${QRIS_SETTINGS_ID}`);
  if (!response.ok) return false;

  const data = await response.json();
  return Array.isArray(data) ? data.length > 0 : Boolean(data?.id);
}

export async function saveQrisImageToSpreadsheet(imageUrl) {
  if (!isSpreadsheetApiConfigured()) return imageUrl;

  const qrisData = buildQrisSettingsRow(imageUrl);
  const rowExists = await hasQrisSettingsRow();
  const response = await fetch(
    rowExists ? `${SPREADSHEET_API_URL}/id/${QRIS_SETTINGS_ID}` : SPREADSHEET_API_URL,
    {
      method: rowExists ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rowExists ? qrisData : [qrisData]),
    }
  );

  if (!response.ok) {
    throw new Error("Gagal menyimpan QRIS ke spreadsheet.");
  }

  return imageUrl;
}

export async function reduceStockInSpreadsheet(cart) {
  if (!isSpreadsheetApiConfigured()) return null;

  const response = await fetch(SPREADSHEET_API_URL);
  if (!response.ok) {
    throw new Error("Gagal mengambil stok terbaru dari spreadsheet.");
  }

  const rows = await response.json();
  const productRows = rows.filter((row) => !isAppSettingsRow(row));
  const updatedProducts = productRows.map(normalizeProductRow);

  const updates = cart.map((item) => {
    const currentProduct = updatedProducts.find((product) => product.id === item.id);
    if (!currentProduct) {
      throw new Error(`Produk "${item.name}" tidak ditemukan di spreadsheet.`);
    }

    const requestedQty = Number(item.qty || 0);
    const currentStock = Number(currentProduct.stock || 0);

    if (requestedQty > currentStock) {
      throw new Error(`Stok "${currentProduct.name}" tinggal ${currentStock}.`);
    }

    return {
      ...currentProduct,
      stock: currentStock - requestedQty,
    };
  });

  for (const updatedProduct of updates) {
    const updateResponse = await fetch(
      `${SPREADSHEET_API_URL}/id/${encodeURIComponent(updatedProduct.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Gagal mengurangi stok "${updatedProduct.name}".`);
    }
  }

  return updatedProducts.map((product) => {
    const updatedProduct = updates.find((item) => item.id === product.id);
    return updatedProduct || product;
  });
}

// Tambahkan API Key ImgBB Anda di sini, atau lewat VITE_IMGBB_API_KEY di file .env
export const IMGBB_API_KEY =
  import.meta.env.VITE_IMGBB_API_KEY?.trim() || "28a8ea4d3e860717c74eeb1cafa39240";

export async function uploadImageToImgBB(file) {
  if (!IMGBB_API_KEY) {
    throw new Error("ImgBB API Key belum diatur. Silakan atur di src/utils/api.js");
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Gagal mengunggah gambar ke ImgBB.");
    }

    const result = await response.json();
    const directImageUrl =
      result.data?.display_url || result.data?.image?.url || result.data?.url || "";

    if (!directImageUrl) {
      throw new Error("ImgBB tidak mengembalikan URL gambar.");
    }

    if (!getDirectImgBbImageUrl(directImageUrl)) {
      throw new Error("URL gambar ImgBB tidak valid untuk ditampilkan.");
    }

    return directImageUrl;
  } catch (error) {
    console.error("Error uploading image to ImgBB:", error);
    throw error;
  }
}
