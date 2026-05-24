import {
  ADMIN_SETTINGS_ID,
  SPREADSHEET_API_URL,
  isSpreadsheetApiConfigured,
} from "./api";
import {
  hashPassword,
  isHashedPassword,
  safeCompare,
  generateSessionToken,
} from "./crypto";

const DEFAULT_ADMIN_USERNAME = "admin";
const ADMIN_SESSION_KEY = "admin_session";
const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

// Rate limiting login admin
const LOGIN_ATTEMPTS_KEY = "admin_login_attempts";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 menit

// Lazy: error muncul saat login dipanggil (bukan saat import),
// jadi UI tetap bisa load walau env belum lengkap.
function getFallbackAdminAccount() {
  const username =
    import.meta.env.VITE_ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME;
  const password = import.meta.env.VITE_ADMIN_PASSWORD?.trim();

  if (!password) {
    throw new Error(
      "VITE_ADMIN_PASSWORD belum diatur. Tambahkan di file .env (lokal) atau di environment variable hosting (Vercel/Netlify)."
    );
  }

  return { username, password };
}

function buildAdminSettingsRow(account) {
  return {
    id: ADMIN_SETTINGS_ID,
    name: account.username,
    category: "__settings__",
    price: "",
    oldPrice: "",
    stock: "",
    tag: "system",
    description: account.password, // sudah dalam bentuk hash
    image: "",
  };
}

async function fetchAdminRow() {
  if (!isSpreadsheetApiConfigured()) return null;

  const response = await fetch(
    `${SPREADSHEET_API_URL}/id/${ADMIN_SETTINGS_ID}`
  );
  if (!response.ok) return null;

  const data = await response.json();
  const row = Array.isArray(data) ? data[0] : data;
  return row?.id === ADMIN_SETTINGS_ID ? row : null;
}

async function createAdminRowFromFallback() {
  const fallback = getFallbackAdminAccount();
  const hashedPassword = await hashPassword(fallback.password);
  const row = buildAdminSettingsRow({
    username: fallback.username,
    password: hashedPassword,
  });

  const response = await fetch(SPREADSHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([row]),
  });

  if (!response.ok) {
    throw new Error("Gagal membuat akun admin di spreadsheet.");
  }

  return { username: fallback.username, password: hashedPassword };
}

// Migrasi password lama (plaintext) ke hash setelah login berhasil
async function migratePasswordToHash(username, plainPassword) {
  if (!isSpreadsheetApiConfigured()) return;

  try {
    const hashedPassword = await hashPassword(plainPassword);
    const row = buildAdminSettingsRow({ username, password: hashedPassword });
    await fetch(`${SPREADSHEET_API_URL}/id/${ADMIN_SETTINGS_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  } catch {
    // Migrasi gagal tidak boleh blok login. User tetap bisa lanjut.
  }
}

// ========== Rate Limiting ==========

function getLoginAttempts() {
  try {
    const data = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || "null");
    if (!data) return { count: 0, lockedUntil: 0 };
    return {
      count: Number(data.count || 0),
      lockedUntil: Number(data.lockedUntil || 0),
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function setLoginAttempts(state) {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(state));
}

function clearLoginAttempts() {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

export function getLoginLockoutInfo() {
  const attempts = getLoginAttempts();
  const now = Date.now();
  if (attempts.lockedUntil > now) {
    const remainingMs = attempts.lockedUntil - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      isLocked: true,
      remainingSeconds,
      remainingMinutes: Math.ceil(remainingSeconds / 60),
    };
  }
  return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0 };
}

function recordFailedAttempt() {
  const attempts = getLoginAttempts();
  const now = Date.now();
  const newCount = attempts.lockedUntil > now ? attempts.count : attempts.count + 1;

  if (newCount >= MAX_LOGIN_ATTEMPTS) {
    setLoginAttempts({
      count: newCount,
      lockedUntil: now + LOCKOUT_DURATION_MS,
    });
  } else {
    setLoginAttempts({ count: newCount, lockedUntil: 0 });
  }
}

// ========== Login ==========

export async function verifyAdminLogin(username, password) {
  // Cek rate limit dulu
  const lockInfo = getLoginLockoutInfo();
  if (lockInfo.isLocked) {
    throw new Error(
      `Terlalu banyak percobaan gagal. Coba lagi dalam ${lockInfo.remainingMinutes} menit.`
    );
  }

  let adminRow = await fetchAdminRow();
  let adminAccount;

  if (adminRow) {
    adminAccount = {
      username: adminRow.name || DEFAULT_ADMIN_USERNAME,
      password: adminRow.description || "",
    };
  } else {
    // Belum ada row admin → buat dari fallback (sudah di-hash)
    adminAccount = await createAdminRowFromFallback();
    adminRow = { name: adminAccount.username, description: adminAccount.password };
  }

  const inputUsername = String(username || "").trim();
  const inputPassword = String(password || "");

  if (!safeCompare(inputUsername, adminAccount.username)) {
    recordFailedAttempt();
    return false;
  }

  let isPasswordMatch = false;

  if (isHashedPassword(adminAccount.password)) {
    // Password tersimpan dalam bentuk hash
    const inputHash = await hashPassword(inputPassword);
    isPasswordMatch = safeCompare(inputHash, adminAccount.password);
  } else {
    // Legacy: password masih plaintext di spreadsheet
    isPasswordMatch = safeCompare(inputPassword, adminAccount.password);
    if (isPasswordMatch) {
      // Migrasi otomatis ke hash
      await migratePasswordToHash(adminAccount.username, inputPassword);
    }
  }

  if (!isPasswordMatch) {
    recordFailedAttempt();
    return false;
  }

  clearLoginAttempts();
  return true;
}

// ========== Session ==========

export function saveAdminSession() {
  const session = {
    token: generateSessionToken(),
    expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
    createdAt: Date.now(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function isAdminSessionValid() {
  try {
    const session = JSON.parse(
      localStorage.getItem(ADMIN_SESSION_KEY) || "null"
    );
    if (!session?.token || typeof session.token !== "string") return false;
    return Number(session.expiresAt || 0) > Date.now();
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem("admin_logged_in");
}
