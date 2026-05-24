import { useEffect, useState } from "react";
import {
  saveAdminSession,
  verifyAdminLogin,
  getLoginLockoutInfo,
} from "../utils/adminAuth";

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockInfo, setLockInfo] = useState(() => getLoginLockoutInfo());

  // Update countdown setiap detik saat user terkunci
  useEffect(() => {
    if (!lockInfo.isLocked) return;
    const interval = setInterval(() => {
      const newInfo = getLoginLockoutInfo();
      setLockInfo(newInfo);
      if (!newInfo.isLocked) {
        setError("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockInfo.isLocked]);

  function handleChange(e) {
    setForm((currentForm) => ({
      ...currentForm,
      [e.target.name]: e.target.value,
    }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (lockInfo.isLocked) return;

    setIsSubmitting(true);
    setError("");

    try {
      const isValidLogin = await verifyAdminLogin(form.username.trim(), form.password);

      if (isValidLogin) {
        saveAdminSession();
        onLogin();
        return;
      }

      const newLockInfo = getLoginLockoutInfo();
      setLockInfo(newLockInfo);
      if (newLockInfo.isLocked) {
        setError(
          `Terlalu banyak percobaan gagal. Coba lagi dalam ${newLockInfo.remainingMinutes} menit.`
        );
      } else {
        setError("Username atau password salah.");
      }
    } catch (err) {
      setError(err.message);
      setLockInfo(getLoginLockoutInfo());
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDisabled = isSubmitting || lockInfo.isLocked;

  return (
    <main>
      <section className="login-page">
        <div className="login-card">
          <div className="login-icon" aria-hidden="true">
            &#128272;
          </div>

          <h1>Login Admin</h1>

          <form onSubmit={handleSubmit}>
            <label>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Masukkan username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={isDisabled}
              maxLength={100}
              required
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Masukkan password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={isDisabled}
              maxLength={200}
              required
            />

            {error ? <div className="login-error">{error}</div> : null}

            {lockInfo.isLocked ? (
              <div className="login-error">
                Login terkunci. Tunggu {lockInfo.remainingSeconds} detik lagi.
              </div>
            ) : null}

            <button type="submit" className="login-btn" disabled={isDisabled}>
              {isSubmitting
                ? "Memeriksa..."
                : lockInfo.isLocked
                ? "Login Terkunci"
                : "Masuk Admin"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
