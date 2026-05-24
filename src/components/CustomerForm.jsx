const FIELD_LIMITS = {
  name: 100,
  phone: 20,
  address: 500,
  note: 500,
};

// Hapus karakter kontrol dan trim. Tetap mempertahankan emoji dan karakter umum.
function sanitizeInput(value, maxLength) {
  const cleaned = String(value || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, maxLength);
  return cleaned;
}

// Untuk nomor HP: hanya digit, +, spasi, dan tanda hubung
function sanitizePhone(value) {
  return String(value || "")
    .replace(/[^\d+\s-]/g, "")
    .slice(0, FIELD_LIMITS.phone);
}

export default function CustomerForm({ customer, setCustomer }) {
  function handleChange(e) {
    const { name, value } = e.target;
    let sanitizedValue;

    if (name === "phone") {
      sanitizedValue = sanitizePhone(value);
    } else {
      sanitizedValue = sanitizeInput(value, FIELD_LIMITS[name] || 500);
    }

    setCustomer({
      ...customer,
      [name]: sanitizedValue,
    });
  }

  return (
    <div className="panel">
      <h2>Data Customer</h2>

      <input
        name="name"
        placeholder="Nama customer"
        value={customer.name}
        onChange={handleChange}
        maxLength={FIELD_LIMITS.name}
        autoComplete="name"
      />

      <input
        name="phone"
        type="tel"
        placeholder="Nomor HP"
        value={customer.phone}
        onChange={handleChange}
        maxLength={FIELD_LIMITS.phone}
        autoComplete="tel"
        inputMode="tel"
      />

      <textarea
        name="address"
        placeholder="Alamat lengkap"
        value={customer.address}
        onChange={handleChange}
        maxLength={FIELD_LIMITS.address}
        autoComplete="street-address"
      />

      <textarea
        name="note"
        placeholder="Catatan"
        value={customer.note}
        onChange={handleChange}
        maxLength={FIELD_LIMITS.note}
      />
    </div>
  );
}
