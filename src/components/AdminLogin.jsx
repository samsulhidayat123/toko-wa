import { useState } from "react";
import { saveAdminSession, verifyAdminLogin } from "../utils/adminAuth";

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((currentForm) => ({
      ...currentForm,
      [e.target.name]: e.target.value,
    }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const isValidLogin = await verifyAdminLogin(form.username.trim(), form.password);

      if (isValidLogin) {
        saveAdminSession();
        onLogin();
        return;
      }

      setError("Username atau password salah.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              required
            />

            {error ? <div className="login-error">{error}</div> : null}

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? "Memeriksa..." : "Masuk Admin"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
