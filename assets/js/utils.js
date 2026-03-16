(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const numFromText = (t) => Number((t || '').replace(/[^\d.-]/g, '') || 0);

  const ROOT_LOCK_CLASS = 'is-filter-open';
  let lockCount = 0;
  const lockBackground = () => {
    lockCount++;
    document.documentElement.classList.add(ROOT_LOCK_CLASS);
  };
  const unlockBackground = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.documentElement.classList.remove(ROOT_LOCK_CLASS);
  };

  let ignoreDocClickUntil = 0;
  const armDocClickGuard = (ms = 100) => { ignoreDocClickUntil = performance.now() + ms; };
  const shouldIgnoreDocClick = () => performance.now() < ignoreDocClickUntil;

  const copyCardImageTo = (srcImg, destImg, sizes = '(min-width:768px) 50vw, 85vw') => {
    if (!srcImg || !destImg) return;
    destImg.alt = srcImg.alt || '';
    destImg.src = srcImg.src;
    if (srcImg.srcset) {
      destImg.srcset = srcImg.srcset;
      destImg.sizes  = sizes;
    } else {
      destImg.removeAttribute('srcset');
      destImg.removeAttribute('sizes');
    }
    destImg.loading  = 'eager';
    destImg.decoding = 'async';
  };

  const LS_KEY = 'naterra_cart';

  function readCart(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch(e){ return {}; }
  }
  function getCartCount(){
    const cart = readCart();
    return Object.values(cart).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }

  function updateCartBadge(){
    const el = document.getElementById('cartBadge');
    if (!el) return;
    const count = getCartCount();
    if (count > 0) {
      el.textContent = String(count);
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  document.addEventListener('DOMContentLoaded', updateCartBadge);
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY) updateCartBadge();
  });

  window.Ntr = {
    $, $$, numFromText,
    lockBackground, unlockBackground,
    armDocClickGuard, shouldIgnoreDocClick,
    copyCardImageTo,
  };
  window.updateCartBadge = updateCartBadge;

  (function setupFileProtocolFallback(){
    if (location.protocol !== 'file:') return;

    const PRODUCTS_JSON_RE    = /\bassets\/data\/products\.json(?:[?#].*)?$/;
    const PRODUCT_DETAIL_RE   = /\bassets\/data\/products\/([^\/]+)\.json(?:[?#].*)?$/;
    const PRODUCTS_JS_PATH    = './assets/data/products.js';
    const PRODUCT_DETAILS_JS  = './assets/data/product-details.js';
    let   ensureDataPromise  = null;

    function ensureProductsData(){
      if (ensureDataPromise) return ensureDataPromise;
      if (window.NaterraProducts) {
        ensureDataPromise = Promise.resolve();
        return ensureDataPromise;
      }
      ensureDataPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PRODUCTS_JS_PATH;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
      return ensureDataPromise;
    }

    let ensureDetailsPromise = null;
    function ensureProductDetails(){
      if (ensureDetailsPromise) return ensureDetailsPromise;
      if (window.NaterraProductDetails) {
        ensureDetailsPromise = Promise.resolve();
        return ensureDetailsPromise;
      }
      ensureDetailsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PRODUCT_DETAILS_JS;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
      return ensureDetailsPromise;
    }

    const origFetch = window.fetch?.bind(window);
    if (!origFetch) return;

    window.fetch = async function(input, init){
    try {
        const url = typeof input === 'string' ? input : (input && input.url);
        if (url && PRODUCTS_JSON_RE.test(url)) {
          await ensureProductsData();
          const json = JSON.stringify(window.NaterraProducts || {});
          const blob = new Blob([json], { type: 'application/json' });
          return new Response(blob, { status: 200, statusText: 'OK' });
        }
        const m = url && url.match(PRODUCT_DETAIL_RE);
        if (m) {
          const id = m[1];
          await ensureProductDetails();
          const data = (window.NaterraProductDetails && window.NaterraProductDetails[id]) || {};
          const json = JSON.stringify(data);
          const blob = new Blob([json], { type: 'application/json' });
          return new Response(blob, { status: 200, statusText: 'OK' });
        }
      } catch(_) {}
      return origFetch(input, init);
    };
  })();

})();
