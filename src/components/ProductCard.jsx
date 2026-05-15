import { formatRupiah } from "../utils/format";
import { DEFAULT_PRODUCT_IMAGE } from "../utils/api";
import { useNotification } from "../utils/notification";

export default function ProductCard({ product, cart, setCart, onBuyNow }) {
  const { notify } = useNotification();
  const stock = Number(product.stock || 0);
  const existingQty = Number(cart.find((item) => item.id === product.id)?.qty || 0);
  const isOutOfStock = stock <= 0;
  const isMaxQtySelected = existingQty >= stock;
  const productAnchorId = `produk-${encodeURIComponent(
    String(product.id || product.name || "item")
  )}`;

  function getProductShareText(productUrl) {
    const lines = [
      `Cek produk ini: ${product.name}`,
      `Harga: ${formatRupiah(product.price)}`,
      product.description ? `Detail: ${product.description}` : "",
      productUrl,
    ];

    return lines.filter(Boolean).join("\n");
  }

  async function copyShareText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function addToCart() {
    if (isOutOfStock) {
      notify.warning("Stok produk habis.");
      return;
    }

    if (isMaxQtySelected) {
      notify.warning(`Stok "${product.name}" hanya ${stock}.`);
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  }

  function handleBuyNow() {
    if (isOutOfStock) {
      notify.warning("Stok produk habis.");
      return;
    }

    if (onBuyNow) {
      onBuyNow(product);
    } else {
      addToCart();
    }
  }

  async function shareProduct() {
    const productUrl = `${window.location.origin}${window.location.pathname}#${productAnchorId}`;
    const shareText = getProductShareText(productUrl);

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        });
        return;
      }

      await copyShareText(shareText);
      notify.success("Info produk berhasil disalin untuk dibagikan.");
    } catch (err) {
      if (err.name === "AbortError") return;
      notify.error("Gagal membagikan produk. Coba lagi nanti.");
    }
  }

  return (
    <div className="product-card mini-card" id={productAnchorId}>
      <div className="mini-img-box">
        <img
          src={product.image || DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
          }}
        />

        <span className="mini-tag">{product.tag || product.category || "Ready"}</span>
      </div>

      <div className="mini-body">
        <div className="mini-category">{product.category}</div>

        <h3>{product.name}</h3>

        <p>{product.description}</p>

        <div className="mini-info">
          <span>Stok: {stock}</span>
          {product.oldPrice ? <del>{formatRupiah(product.oldPrice)}</del> : null}
        </div>

        <div className="mini-price">{formatRupiah(product.price)}</div>

        <div className="mini-actions">
          <button onClick={addToCart} disabled={isOutOfStock || isMaxQtySelected}>
            Tambah
          </button>
          <button className="wa-mini" onClick={handleBuyNow} disabled={isOutOfStock}>
            Beli
          </button>
          <button className="share-mini" onClick={shareProduct}>
            Bagikan
          </button>
        </div>
      </div>
    </div>
  );
}
