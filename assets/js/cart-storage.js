(() => {
  'use strict';

  const KEYS = ['naterraCart', 'naterra_cart'];
  const PRIMARY_KEY = KEYS[0];

  function loadRaw() {
    for (const k of KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        return JSON.parse(raw);
      } catch (_) {}
    }
    return {};
  }

  function normalizeToMap(raw) {
    if (Array.isArray(raw)) {
      const map = {};
      raw.forEach(x => {
        const id = String(x.id || x.name || '');
        if (!id) return;
        map[id] = {
          name: String(x.name || ''),
          price: Number(x.price || 0),
          qty: Math.max(1, Math.min(99, parseInt(x.qty, 10) || 1)),
          img: String(x.img || '')
        };
      });
      return map;
    }
    if (raw && typeof raw === 'object') {
      const map = {};
      Object.keys(raw).forEach(id => {
        const v = raw[id] || {};
        map[String(id)] = {
          name: String(v.name || ''),
          price: Number(v.price || 0),
          qty: Math.max(1, Math.min(99, parseInt(v.qty, 10) || 1)),
          img: String(v.img || '')
        };
      });
      return map;
    }
    return {};
  }

  function save(map) {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(map));
  }

  const CartStorage = {
    loadMap() { return normalizeToMap(loadRaw()); },

    add(id, qty = 1, { name = '', price = 0, img = '' } = {}) {
      const map = this.loadMap();
      const key = String(id || name);
      if (!key) return;
      const cur = map[key] || { name, price: Number(price) || 0, qty: 0, img };
      cur.qty = Math.max(1, Math.min(99, (cur.qty || 0) + (parseInt(qty, 10) || 1)));
      if (name)  cur.name  = name;
      if (price) cur.price = Number(price) || 0;
      if (img)   cur.img   = img;
      map[key] = cur;
      save(map);
    },

    update(id, qty) {
      const map = this.loadMap();
      const key = String(id);
      if (!map[key]) return;
      const q = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
      map[key].qty = q;
      save(map);
    },

    remove(id) {
      const map = this.loadMap();
      delete map[String(id)];
      save(map);
    },

    clear() { save({}); },

    totals() {
      const map = this.loadMap();
      let count = 0, amount = 0;
      Object.values(map).forEach(v => {
        count  += v.qty || 0;
        amount += (v.qty || 0) * (v.price || 0);
      });
      return { count, amount };
    }
  };

  window.addToCart = function addToCart(productId, qty = 1, meta = {}) {
    CartStorage.add(productId, qty, meta);
    return CartStorage.totals();
  };

  window.getCartTotals = () => CartStorage.totals();

  window.CartStorage = CartStorage;
})();
