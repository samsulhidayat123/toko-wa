import {
  ADMIN_SETTINGS_ID,
  SPREADSHEET_API_URL,
  isSpreadsheetApiConfigured,
} from "./api";

const DEFAULT_ADMIN_USERNAME = "admin";
const ADMIN_SESSION_KEY = "admin_session";
const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

const FALLBACK_ADMIN_ACCOUNT = {
  username: import.meta.env.VITE_ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME,
  password: import.meta.env.VITE_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD,
};

function buildAdminSettingsRow(account) {
  return {
    id: ADMIN_SETTINGS_ID,
    name: account.username,
    category: "__settings__",
    price: "",
    oldPrice: "",
    stock: "",
    tag: "system",
    description: account.password,
    image: "",
  };
}

function getAccountFromRow(row) {
  return {
    username: row?.name || FALLBACK_ADMIN_ACCOUNT.username,
    password: row?.description || FALLBACK_ADMIN_ACCOUNT.password,
  };
}

async function fetchAdminAccountFromSpreadsheet() {
  if (!isSpreadsheetApiConfigured()) return FALLBACK_ADMIN_ACCOUNT;

  const response = await fetch(`${SPREADSHEET_API_URL}/id/${ADMIN_SETTINGS_ID}`);

  if (response.ok) {
    const data = await response.json();
    const row = Array.isArray(data) ? data[0] : data;

    if (row?.id === ADMIN_SETTINGS_ID) {
      return getAccountFromRow(row);
    }
  }

  const createResponse = await fetch(SPREADSHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([buildAdminSettingsRow(FALLBACK_ADMIN_ACCOUNT)]),
  });

  if (!createResponse.ok) {
    throw new Error("Gagal membuat akun admin di spreadsheet.");
  }

  return FALLBACK_ADMIN_ACCOUNT;
}

export async function verifyAdminLogin(username, password) {
  const adminAccount = await fetchAdminAccountFromSpreadsheet();
  return username === adminAccount.username && password === adminAccount.password;
}

export function saveAdminSession() {
  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
    })
  );
}

export function isAdminSessionValid() {
  try {
    const session = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
    return Number(session?.expiresAt || 0) > Date.now();
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem("admin_logged_in");
}
