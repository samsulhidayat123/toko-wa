export function getStorage(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
