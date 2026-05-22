export default function Header({ page, setPage, isAdminLoggedIn, onLogout }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: "900", fontSize: "1.2em", color: "white" }}>
          Q
        </div>
        <div>
          <span className="brand-title">Toserba Qonita</span>
          <small>Toko Serba Ada</small>
        </div>
      </div>

      <nav>
        <button
          className={page === "customer" ? "active" : ""}
          onClick={() => setPage("customer")}
        >
          Belanja
        </button>

        <button
          className={page === "admin" ? "active" : ""}
          onClick={() => setPage("admin")}
        >
          {isAdminLoggedIn ? "Admin Produk" : "Login Admin"}
        </button>

        {isAdminLoggedIn && (
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
