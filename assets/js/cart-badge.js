(() => {
  'use strict';

  const LS_KEY = 'naterra_cart';

  function readCart(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch(e){ return {}; }
  }
  function getCartCount(){
    const cart = readCart();
    return Object.values(cart).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }

  window.updateCartBadge = function(){
    const el = document.getElementById('cartBadge');
    if (!el) return;
    const count = getCartCount();
    if (count > 0) {
      el.textContent = String(count);
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) {
      if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    }
  });
})();
