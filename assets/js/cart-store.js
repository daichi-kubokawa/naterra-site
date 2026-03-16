(() => {
  'use strict';

  const LS_KEY = 'naterra_cart';

  const SHIPPING_FREE_THRESHOLD = 5000;
  const SHIPPING_FEE = 600;

  function loadCart() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch {
      return {};
    }
  }

  function saveCart(cartObj) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cartObj || {}));
    } catch {}
  }

  function clearCart() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }

  function clampQty(qty, stock = null) {
    const max = Math.max(1, Math.min(99, (Number(stock) || 99)));
    return Math.min(Math.max(Number(qty) || 1, 1), max);
  }

  function addItem(id, qty = 1, payload = {}) {
    const cart = loadCart();
    const cur = cart[id] || {
      id,
      name: payload.name || '',
      price: Number(payload.price) || 0,
      img: payload.img || '',
      stock: payload.stock ?? null
    };
    const nextQty = clampQty((cur.qty || 0) + (Number(qty) || 1), cur.stock);
    cart[id] = { ...cur, qty: nextQty };
    saveCart(cart);
    return cart;
  }

  function setQty(id, qty) {
    const cart = loadCart();
    if (!cart[id]) return cart;
    cart[id].qty = clampQty(qty, cart[id].stock);
    saveCart(cart);
    return cart;
  }

  function removeItem(id) {
    const cart = loadCart();
    if (cart[id]) delete cart[id];
    saveCart(cart);
    return cart;
  }

  function calcTotals(cart) {
    let subtotal = 0;
    let count = 0;
    Object.values(cart || {}).forEach(it => {
      const q = Number(it.qty) || 0;
      const p = Number(it.price) || 0;
      subtotal += q * p;
      count += q;
    });
    const shipping = (subtotal >= SHIPPING_FREE_THRESHOLD || subtotal === 0) ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;
    const freeRemain = Math.max(0, SHIPPING_FREE_THRESHOLD - subtotal);
    return { count, subtotal, shipping, total, freeRemain,
             rule: { threshold: SHIPPING_FREE_THRESHOLD, fee: SHIPPING_FEE } };
  }

  function yen(n) {
    return '¥' + (Number(n) || 0).toLocaleString('ja-JP');
  }

  window.CartStore = {
    LS_KEY,
    loadCart, saveCart, clearCart,
    addItem, setQty, removeItem,
    calcTotals, yen,
  };
})();
