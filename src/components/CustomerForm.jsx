export default function CustomerForm({ customer, setCustomer }) {
  function handleChange(e) {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value,
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
      />

      <input
        name="phone"
        placeholder="Nomor HP"
        value={customer.phone}
        onChange={handleChange}
      />

      <textarea
        name="address"
        placeholder="Alamat lengkap"
        value={customer.address}
        onChange={handleChange}
      />

      <textarea
        name="note"
        placeholder="Catatan"
        value={customer.note}
        onChange={handleChange}
      />
    </div>
  );
}
