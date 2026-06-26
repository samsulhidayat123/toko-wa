import { neon } from "@neondatabase/serverless";

const QRIS_SETTINGS_ID = "__app_qris_settings__";
const ADMIN_SETTINGS_ID = "__app_admin_account__";
const SETTINGS_IDS = new Set([QRIS_SETTINGS_ID, ADMIN_SETTINGS_ID]);

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  return {
    isAllowed,
    headers: isAllowed
      ? {
          "access-control-allow-origin": origin || "*",
          "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          vary: "Origin",
        }
      : {},
  };
}

function getSql(env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diatur di Cloudflare Worker.");
  }

  return neon(env.DATABASE_URL);
}

function numberOrZero(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function integerOrZero(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.trunc(numberValue)) : 0;
}

function createId() {
  return crypto.randomUUID();
}

function isSettingsRow(row) {
  return SETTINGS_IDS.has(row?.id);
}

function rowToProduct(row) {
  return {
    id: String(row.id || createId()),
    name: String(row.name || ""),
    category: String(row.category || ""),
    price: numberOrZero(row.price),
    oldPrice: nullableNumber(row.oldPrice),
    stock: integerOrZero(row.stock),
    tag: String(row.tag || "Ready"),
    description: String(row.description || ""),
    image: String(row.image || ""),
    rating: nullableNumber(row.rating) || 0,
  };
}

function productFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "",
    price: Number(row.price || 0),
    oldPrice: row.old_price === null ? "" : Number(row.old_price || 0),
    stock: Number(row.stock || 0),
    tag: row.tag || "Ready",
    description: row.description || "",
    image: row.image || "",
    rating: Number(row.rating || 0),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSiteUrl(env) {
  return String(env.SITE_URL || env.ALLOWED_ORIGIN || "https://toserbaqonita.my.id")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
}

function buildProductAnchorUrl(product, env) {
  const siteUrl = getSiteUrl(env);
  const anchorId = `produk-${encodeURIComponent(String(product.id || product.name || "item"))}`;
  return `${siteUrl}/#${anchorId}`;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function productSharePage(product, request, env) {
  const productUrl = buildProductAnchorUrl(product, env);
  const pageUrl = new URL(request.url).href;
  const title = `${product.name} - Toserba Qonita`;
  const ratingStars = product.rating ? "⭐ ".repeat(Math.round(product.rating)) : "";
  const badgeText = product.tag === "Best seller" ? "🔥 Best Seller" : product.tag === "New" ? "✨ New" : product.tag || "Ready";
  const description = [
    ratingStars ? `${ratingStars} (${product.rating}/5)` : "⭐ Produk berkualitas",
    product.category,
    product.price ? `Harga ${new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(product.price))}` : "",
    product.description,
  ].filter(Boolean).join(" | ");
  const image = product.image || "https://images.unsplash.com/photo-1556741533-411cf82e4e2d?auto=format&fit=crop&w=1200&q=80";

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="Toserba Qonita">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(pageUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(product.name)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <link rel="canonical" href="${escapeHtml(productUrl)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
      main { max-width: 500px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .product-image { width: 100%; height: 300px; object-fit: cover; }
      .product-info { padding: 20px; }
      .badge { display: inline-block; background: #ff6b6b; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
      h1 { font-size: 24px; margin-bottom: 10px; color: #333; }
      .rating { font-size: 18px; margin-bottom: 10px; }
      .price { font-size: 28px; font-weight: bold; color: #ff6b6b; margin-bottom: 10px; }
      .category { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
      .description { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px; }
      .cta { display: flex; gap: 10px; }
      .btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; text-align: center; transition: 0.3s; }
      .btn-primary { background: #25d366; color: white; }
      .btn-primary:hover { background: #1f9d4d; }
      .btn-secondary { background: #e0e0e0; color: #333; }
      .btn-secondary:hover { background: #d0d0d0; }
      .stock { font-size: 12px; color: #666; padding-top: 10px; border-top: 1px solid #eee; }
    </style>
  </head>
  <body>
    <main>
      <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" class="product-image">
      <div class="product-info">
        <div class="badge">${escapeHtml(badgeText)}</div>
        <h1>${escapeHtml(product.name)}</h1>
        ${ratingStars ? `<div class="rating">${ratingStars} (${product.rating}/5)</div>` : '<div class="rating">⭐ Produk berkualitas</div>'}
        <div class="category">${escapeHtml(product.category)}</div>
        <div class="price">Rp ${new Intl.NumberFormat("id-ID", {
          maximumFractionDigits: 0,
        }).format(Number(product.price))}</div>
        <div class="description">${escapeHtml(product.description)}</div>
        <div class="cta">
          <a href="https://wa.me/?text=${encodeURIComponent(`Saya tertarik dengan produk ini: ${product.name}\n${productUrl}`)}" class="btn btn-primary">💬 WhatsApp</a>
          <a href="${escapeHtml(productUrl)}" class="btn btn-secondary">Lihat di Toko</a>
        </div>
        <div class="stock">Stok: ${product.stock > 0 ? product.stock : "Habis"}</div>
      </div>
    </main>
  </body>
</html>`;
}

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      price NUMERIC NOT NULL DEFAULT 0,
      old_price NUMERIC,
      stock INTEGER NOT NULL DEFAULT 0,
      tag TEXT NOT NULL DEFAULT 'Ready',
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      rating NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  try {
    await sql`
      ALTER TABLE products ADD COLUMN rating NUMERIC DEFAULT 0
    `;
  } catch {
    // Column already exists, no action needed
  }
}

async function listRows(sql) {
  const settingsRows = await sql`
    SELECT data
    FROM app_settings
    ORDER BY created_at ASC
  `;
  const productRows = await sql`
    SELECT *
    FROM products
    ORDER BY created_at ASC, name ASC
  `;

  return [
    ...settingsRows.map((row) => row.data),
    ...productRows.map(productFromDb),
  ];
}

async function getRowById(sql, id) {
  if (SETTINGS_IDS.has(id)) {
    const rows = await sql`
      SELECT data
      FROM app_settings
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0]?.data || null;
  }

  const rows = await sql`
    SELECT *
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? productFromDb(rows[0]) : null;
}

async function upsertSetting(sql, id, row) {
  const data = {
    ...row,
    id,
  };
  await sql`
    INSERT INTO app_settings (id, data)
    VALUES (${id}, ${JSON.stringify(data)}::JSONB)
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
  return data;
}

async function upsertProduct(sql, row) {
  const product = rowToProduct(row);
  await sql`
    INSERT INTO products (
      id, name, category, price, old_price, stock, tag, description, image, rating
    )
    VALUES (
      ${product.id}, ${product.name}, ${product.category}, ${product.price},
      ${product.oldPrice}, ${product.stock}, ${product.tag},
      ${product.description}, ${product.image}, ${product.rating}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      price = EXCLUDED.price,
      old_price = EXCLUDED.old_price,
      stock = EXCLUDED.stock,
      tag = EXCLUDED.tag,
      description = EXCLUDED.description,
      image = EXCLUDED.image,
      rating = EXCLUDED.rating,
      updated_at = NOW()
  `;
  return product;
}

async function upsertRow(sql, row, forcedId = "") {
  const id = String(forcedId || row?.id || createId());
  if (SETTINGS_IDS.has(id) || isSettingsRow(row)) {
    return upsertSetting(sql, id, row);
  }

  return upsertProduct(sql, { ...row, id });
}

async function deleteRowById(sql, id) {
  if (SETTINGS_IDS.has(id)) {
    await sql`DELETE FROM app_settings WHERE id = ${id}`;
    return { id };
  }

  const rows = await sql`
    DELETE FROM products
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? productFromDb(rows[0]) : null;
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleRequest(request, env) {
  const cors = getCorsHeaders(request, env);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: cors.isAllowed ? 204 : 403,
      headers: cors.headers,
    });
  }

  if (!cors.isAllowed) {
    return jsonResponse({ message: "Origin tidak diizinkan." }, 403);
  }

  const sql = getSql(env);
  await ensureSchema(sql);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const idMatch = path.match(/^\/id\/(.+)$/);
  const shareMatch = path.match(/^\/share\/(.+)$/);
  const indexMatch = path.match(/^\/(\d+)$/);

  if (request.method === "GET" && shareMatch) {
    const product = await getRowById(sql, decodeURIComponent(shareMatch[1]));
    if (!product || isSettingsRow(product)) {
      return htmlResponse("<!doctype html><title>Produk tidak ditemukan</title><h1>Produk tidak ditemukan</h1>", 404);
    }

    return htmlResponse(productSharePage(product, request, env));
  }

  if (request.method === "GET" && path === "/") {
    return jsonResponse(await listRows(sql), 200, cors.headers);
  }

  if (request.method === "GET" && idMatch) {
    const row = await getRowById(sql, decodeURIComponent(idMatch[1]));
    return jsonResponse(row ? [row] : [], 200, cors.headers);
  }

  if (request.method === "POST" && path === "/") {
    const body = await parseJson(request);
    const rows = Array.isArray(body) ? body : [body].filter(Boolean);

    if (rows.length === 0) {
      return jsonResponse({ message: "Data kosong." }, 400, cors.headers);
    }

    const saved = [];
    for (const row of rows) {
      saved.push(await upsertRow(sql, row));
    }

    return jsonResponse(saved, 201, cors.headers);
  }

  if (request.method === "PUT" && idMatch) {
    const id = decodeURIComponent(idMatch[1]);
    const body = await parseJson(request);

    if (!body) {
      return jsonResponse({ message: "Data tidak valid." }, 400, cors.headers);
    }

    return jsonResponse(await upsertRow(sql, body, id), 200, cors.headers);
  }

  if (request.method === "DELETE" && idMatch) {
    const deleted = await deleteRowById(sql, decodeURIComponent(idMatch[1]));
    return jsonResponse(deleted || { message: "Data tidak ditemukan." }, deleted ? 200 : 404, cors.headers);
  }

  if (request.method === "DELETE" && indexMatch) {
    const index = Number(indexMatch[1]);
    const rows = await listRows(sql);
    const selected = rows[index];

    if (!selected?.id) {
      return jsonResponse({ message: "Data tidak ditemukan." }, 404, cors.headers);
    }

    const deleted = await deleteRowById(sql, selected.id);
    return jsonResponse(deleted || selected, 200, cors.headers);
  }

  return jsonResponse({ message: "Endpoint tidak ditemukan." }, 404, cors.headers);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return jsonResponse(
        {
          message: error.message || "Terjadi kesalahan server.",
          cause: error.cause?.message || "",
        },
        500
      );
    }
  },
};
