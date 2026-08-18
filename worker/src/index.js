import { neon } from "@neondatabase/serverless";

const QRIS_SETTINGS_ID = "__app_qris_settings__";
const ADMIN_SETTINGS_ID = "__app_admin_account__";
const RECEIPT_SETTINGS_ID = "__app_receipt_settings__";
const SETTINGS_IDS = new Set([QRIS_SETTINGS_ID, ADMIN_SETTINGS_ID, RECEIPT_SETTINGS_ID]);

const SESSION_DURATION_SECONDS = 12 * 60 * 60; // 12 jam
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000; // 5 menit

// Rate limiting login per-IP (best-effort, in-memory per isolate)
const loginAttempts = new Map();

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(text || ""))
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time comparison untuk mencegah timing attack
function safeCompare(a, b) {
  const strA = String(a || "");
  const strB = String(b || "");
  if (strA.length !== strB.length) return false;

  let mismatch = 0;
  for (let i = 0; i < strA.length; i++) {
    mismatch |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
  }
  return mismatch === 0;
}

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
          "access-control-allow-headers": "content-type, authorization, x-auth-token",
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

function generateShortCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isSettingsRow(row) {
  return SETTINGS_IDS.has(row?.id);
}

function rowToProduct(row) {
  return {
    id: String(row.id || createId()),
    short_code: String(row.short_code || generateShortCode()),
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
    short_code: row.short_code || generateShortCode(),
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
      short_code TEXT,
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
    // Column already exists
  }

  try {
    await sql`
      ALTER TABLE products ADD COLUMN short_code TEXT
    `;
  } catch {
    // Column already exists
  }

  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_products_short_code ON products(short_code)
    `;
  } catch {
    // Index already exists
  }

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
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

  const products = await Promise.all(
    productRows.map(async (row) => {
      const product = productFromDb(row);
      return ensureProductHasShortCode(sql, product);
    })
  );

  return [
    ...settingsRows.map((row) => row.data),
    ...products,
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
  if (!rows[0]) return null;
  const product = productFromDb(rows[0]);
  return ensureProductHasShortCode(sql, product);
}

async function getProductByShortCode(sql, short_code) {
  const rows = await sql`
    SELECT *
    FROM products
    WHERE short_code = ${short_code}
    LIMIT 1
  `;
  return rows[0] ? productFromDb(rows[0]) : null;
}

async function ensureProductHasShortCode(sql, product) {
  if (!product.short_code || product.short_code.trim() === "") {
    let newShortCode = generateShortCode();
    let retries = 5;
    // Retry if collision
    while (retries > 0) {
      try {
        await sql`
          UPDATE products
          SET short_code = ${newShortCode}, updated_at = NOW()
          WHERE id = ${product.id} AND (short_code IS NULL OR short_code = '')
        `;
        return { ...product, short_code: newShortCode };
      } catch {
        // Collision, retry with new code
        newShortCode = generateShortCode();
        retries--;
      }
    }
    // If all retries failed, just return with generated code (not saved)
    return { ...product, short_code: newShortCode };
  }
  return product;
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
      id, short_code, name, category, price, old_price, stock, tag, description, image, rating
    )
    VALUES (
      ${product.id}, ${product.short_code}, ${product.name}, ${product.category}, ${product.price},
      ${product.oldPrice}, ${product.stock}, ${product.tag},
      ${product.description}, ${product.image}, ${product.rating}
    )
    ON CONFLICT (id) DO UPDATE SET
      short_code = COALESCE(EXCLUDED.short_code, products.short_code),
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

function extractToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return (request.headers.get("x-auth-token") || "").trim();
}

async function getSession(sql, token) {
  if (!token) return null;
  const rows = await sql`
    SELECT token
    FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0]?.token || null;
}

async function handleLogin(request, sql, env, corsHeaders) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const currentAttempt = loginAttempts.get(ip);

  if (currentAttempt && currentAttempt.lockedUntil > now) {
    const remaining = Math.ceil((currentAttempt.lockedUntil - now) / 60000);
    return jsonResponse(
      { message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${remaining} menit.` },
      429,
      corsHeaders
    );
  }

  const body = await parseJson(request);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");

  if (!username || !password) {
    return jsonResponse({ message: "Username dan password wajib diisi." }, 400, corsHeaders);
  }

  let adminRow = await getRowById(sql, ADMIN_SETTINGS_ID);

  if (!adminRow) {
    // Akun admin belum ada di database → buat dari secret Worker
    const envUser = String(env.ADMIN_USERNAME || "").trim() || "admin";
    const envPass = String(env.ADMIN_PASSWORD || "").trim();
    if (!envPass) {
      return jsonResponse(
        { message: "Belum ada akun admin. Atur secret ADMIN_PASSWORD di Cloudflare Worker." },
        500,
        corsHeaders
      );
    }
    const hashed = `sha256$${await sha256Hex(envPass)}`;
    adminRow = { name: envUser, description: hashed };
    await upsertSetting(sql, ADMIN_SETTINGS_ID, { name: envUser, description: hashed });
  }

  let isMatch = false;

  if (safeCompare(username, adminRow.name || "")) {
    const stored = String(adminRow.description || "");
    if (stored.startsWith("sha256$")) {
      isMatch = safeCompare(await sha256Hex(password), stored.slice("sha256$".length));
    } else {
      // Legacy: password plaintext di database → migrasi ke hash
      isMatch = safeCompare(password, stored);
      if (isMatch) {
        const hashed = `sha256$${await sha256Hex(password)}`;
        await upsertSetting(sql, ADMIN_SETTINGS_ID, { ...adminRow, description: hashed });
      }
    }
  }

  if (!isMatch) {
    const previous = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    const count = previous.count + 1;
    loginAttempts.set(
      ip,
      count >= MAX_LOGIN_ATTEMPTS
        ? { count, lockedUntil: now + LOGIN_LOCK_MS }
        : { count, lockedUntil: 0 }
    );
    return jsonResponse({ message: "Username atau password salah." }, 401, corsHeaders);
  }

  loginAttempts.delete(ip);

  const token = crypto.randomUUID();
  await sql`
    INSERT INTO sessions (token, expires_at)
    VALUES (${token}, NOW() + make_interval(secs => ${SESSION_DURATION_SECONDS}))
  `;

  return jsonResponse(
    {
      token,
      expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
    },
    200,
    corsHeaders
  );
}

async function handleCheckout(sql, cart) {
  const items = Array.isArray(cart) ? cart : [];
  const updates = [];

  for (const item of items) {
    const id = String(item?.id || "");
    const qty = Math.max(0, Math.trunc(Number(item?.qty || 0)));
    if (!id || qty <= 0) continue;

    const rows = await sql`
      UPDATE products
      SET stock = stock - ${qty}, updated_at = NOW()
      WHERE id = ${id} AND stock >= ${qty}
      RETURNING *
    `;

    if (!rows[0]) {
      const existing = await getRowById(sql, id);
      if (!existing || isSettingsRow(existing)) {
        return { error: "Produk tidak ditemukan.", status: 404 };
      }
      return {
        error: `Stok "${existing.name}" tinggal ${Number(existing.stock || 0)}.`,
        status: 409,
      };
    }

    updates.push(productFromDb(rows[0]));
  }

  return { products: updates };
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
  const pMatch = path.match(/^\/p\/(.+)$/);
  const indexMatch = path.match(/^\/(\d+)$/);

  if (request.method === "GET" && pMatch) {
    const identifier = pMatch[1];
    // Try short_code first (if looks like short code)
    let product = null;
    if (identifier.length <= 10 && /^[a-z0-9]+$/.test(identifier)) {
      product = await getProductByShortCode(sql, identifier);
    }
    // Fall back to ID if short code didn't work or wasn't a short code
    if (!product) {
      product = await getRowById(sql, decodeURIComponent(identifier));
    }
    if (!product || isSettingsRow(product)) {
      return htmlResponse("<!doctype html><title>Produk tidak ditemukan</title><h1>Produk tidak ditemukan</h1>", 404);
    }
    return htmlResponse(productSharePage(product, request, env));
  }

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

  if (request.method === "POST" && path === "/login") {
    return handleLogin(request, sql, env, cors.headers);
  }

  if (request.method === "POST" && path === "/checkout") {
    const body = await parseJson(request);
    const result = await handleCheckout(sql, body?.items);

    if (result.error) {
      return jsonResponse({ message: result.error }, result.status, cors.headers);
    }

    return jsonResponse(
      { message: "Stok berhasil dikurangi.", products: result.products },
      200,
      cors.headers
    );
  }

  // Semua endpoint tulis (POST/PUT/DELETE) wajib autentikasi admin
  if (request.method !== "GET") {
    const sessionToken = await getSession(sql, extractToken(request));
    if (!sessionToken) {
      return jsonResponse(
        { message: "Tidak diizinkan. Login admin diperlukan." },
        401,
        cors.headers
      );
    }
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
