import { neon } from "@neondatabase/serverless";

const QRIS_SETTINGS_ID = "__app_qris_settings__";
const ADMIN_SETTINGS_ID = "__app_admin_account__";
const SETTINGS_IDS = new Set([QRIS_SETTINGS_ID, ADMIN_SETTINGS_ID]);

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} belum diatur.`);
  return value;
}

function isSettingsRow(row) {
  return SETTINGS_IDS.has(row?.id);
}

function createId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function normalizeProduct(row) {
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
  };
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
}

async function upsertProduct(sql, product) {
  await sql`
    INSERT INTO products (
      id, name, category, price, old_price, stock, tag, description, image
    )
    VALUES (
      ${product.id}, ${product.name}, ${product.category}, ${product.price},
      ${product.oldPrice}, ${product.stock}, ${product.tag},
      ${product.description}, ${product.image}
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
      updated_at = NOW()
  `;
}

async function upsertSetting(sql, row) {
  await sql`
    INSERT INTO app_settings (id, data)
    VALUES (${row.id}, ${JSON.stringify(row)}::JSONB)
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
}

async function main() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");
  const sheetbestUrl = getRequiredEnv("SHEETBEST_API_URL");
  const replaceProducts = process.argv.includes("--replace-products");
  const dryRun = process.argv.includes("--dry-run");

  console.log("Mengambil data dari Sheetbest...");
  const response = await fetch(sheetbestUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengambil data Sheetbest. HTTP ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Response Sheetbest bukan array.");
  }

  const products = rows.filter((row) => !isSettingsRow(row)).map(normalizeProduct);
  const settings = rows.filter(isSettingsRow);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          products: products.length,
          settings: settings.map((setting) => setting.id),
        },
        null,
        2
      )
    );
    return;
  }

  console.log("Menghubungkan ke Neon dan memastikan tabel...");
  const sql = neon(databaseUrl);
  await ensureSchema(sql);

  if (replaceProducts) {
    console.log("Mengosongkan tabel products di Neon...");
    await sql`DELETE FROM products`;
  }

  console.log(`Memindahkan ${products.length} produk ke Neon...`);
  for (const product of products) {
    await upsertProduct(sql, product);
  }

  console.log(`Memindahkan ${settings.length} setting aplikasi ke Neon...`);
  for (const setting of settings) {
    await upsertSetting(sql, setting);
  }

  console.log(
    JSON.stringify(
      {
        mode: replaceProducts ? "replace-products" : "upsert",
        products: products.length,
        settings: settings.map((setting) => setting.id),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause?.message) {
    console.error(`Penyebab: ${error.cause.message}`);
  }
  process.exit(1);
});
