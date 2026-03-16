(() => {
  'use strict';

  if (window.__NATERRA_CART_MODAL_V23__) return;
  window.__NATERRA_CART_MODAL_V23__ = true;

  const LS_KEY  = 'naterra_cart';
  const MIN_QTY = 1;
  const MAX_QTY = 99;

  let addLock = false;
  const ADD_LOCK_MS = 350;

  let __lastClickSig = '';
  let __lastClickAt  = 0;
  const isDuplicateClick = (btn) => {
    const sig = (btn?.dataset.productId || '') + '|' + (btn?.dataset.addDirect || '') + '|' + location.pathname;
    const now = Date.now();
    const dup = (sig === __lastClickSig) && (now - __lastClickAt < 300);
    __lastClickSig = sig;
    __lastClickAt  = now;
    return dup;
  };

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const numFromText = (t) => Number((t || '').replace(/[^\d.-]/g, '') || 0);
  const fmtYen = (n) => '¥' + (Number(n)||0).toLocaleString('ja-JP');

  const Store = (function ensureStore(){
    if (window.Store && typeof window.Store.read === 'function') return window.Store;

    const Fallback = {
      read(){
        try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
        catch(e){ return {}; }
      },
      write(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj || {})); },
      add(id, qty, { name = '', price = 0, img = '' } = {}){
        if (!id) return this.totals();
        const cart = this.read();
        const cur = cart[id] || { qty: 0, name, price: Number(price)||0, img };
        cur.qty += Number(qty)||0;
        if (name)  cur.name  = name;
        if (img)   cur.img   = img;
        if (price) cur.price = Number(price)||cur.price;
        cart[id] = cur;
        this.write(cart);
        return this.totals();
      },
      setQty(id, qty){
        const q = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(qty)||0));
        const cart = this.read();
        if (cart[id]) { cart[id].qty = q; this.write(cart); }
        return this.totals();
      },
      remove(id){
        const cart = this.read();
        if (id in cart) { delete cart[id]; this.write(cart); }
        return this.totals();
      },
      totals(){
        const cart = this.read();
        let count = 0, amount = 0;
        Object.values(cart).forEach(it => {
          const q = Number(it.qty)||0;
          const p = Number(it.price)||0;
          count  += q;
          amount += q*p;
        });
        return { count, amount };
      },
      clear(){ this.write({}); }
    };
    window.Store = Fallback;
    return Fallback;
  })();

  window.addToCart = (id, qty, meta) => Store.add(id, qty, meta);
  window.CartDebug = {
    add:   (id, qty, meta) => Store.add(id, qty, meta),
    read:  () => Store.read(),
    clear: () => Store.clear(),
    rm:    (id) => Store.remove(id),
  };

  const overlay      = $('#cartOverlay');
  const sheet        = $('#cartSheet');
  const closeBtn     = $('#cartCloseBtn');
  const pName        = $('#cartProductName');
  const pImg         = $('#cartProductImg');
  const qtyMinus     = $('#qtyMinus');
  const qtyPlus      = $('#qtyPlus');
  let   qtyValueEl   = $('#qtyValue');
  let   addBtn       = $('#addToCartBtn');
  const confirm      = $('#cartConfirm');
  const confirmClose = $('#confirmCloseBtn');
  const totalCount   = $('#cartTotalCount');
  const totalPrice   = $('#cartTotalPrice');

  const pdQtyMinus   = $('#pdQtyMinus');
  const pdQtyPlus    = $('#pdQtyPlus');
  const pdQtyValueEl = $('#pdQtyValue');

  let current = { id:'', name:'', price:0, qty:1, img:'' };

  const openLayer = (el) => {
    if (!overlay || !el) return;
    overlay.hidden = false;
    el.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      el.classList.add('is-open');
    });
    document.documentElement.classList.add('is-filter-open');
  };
  const closeLayer = (el) => {
    if (!overlay || !el) return;
    el.classList.remove('is-open');
    const end = () => {
      el.hidden = true;
      el.removeEventListener('transitionend', end);
      const sheetHidden   = !sheet  || sheet.hidden;
      const confirmHidden = !confirm|| confirm.hidden;
      if (sheetHidden && confirmHidden) {
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        document.documentElement.classList.remove('is-filter-open');
      }
    };
    el.addEventListener('transitionend', end);
    setTimeout(end, 260);
  };

  window.openCartConfirm = function(totals){
    if (totalCount && totals?.count != null) totalCount.textContent = String(totals.count);
    if (totalPrice && totals?.amount != null) totalPrice.textContent = fmtYen(totals.amount);
    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    if (confirm) openLayer(confirm);
    else alert('カートに追加しました');
  };

  function reflectQtyToOutput(outEl, n){
    if (!outEl) return;
    const v = String(n);
    if ('value' in outEl) outEl.value = v;
    outEl.textContent = v;
  }
  function toggleStepBtnState(minusBtn, plusBtn, n){
    if (minusBtn) {
      const dis = n <= MIN_QTY;
      minusBtn.disabled = dis;
      minusBtn.setAttribute('aria-disabled', String(dis));
      minusBtn.classList.toggle('is-disabled', dis);
    }
    if (plusBtn) {
      const dis = n >= MAX_QTY;
      plusBtn.disabled = dis;
      plusBtn.setAttribute('aria-disabled', String(dis));
      plusBtn.classList.toggle('is-disabled', dis);
    }
  }

  function openCartSheetFromButton(btn){
    if (!sheet) return;
    const card = btn.closest('.productCard');
    if (!card) return;

    const id    = btn.dataset.productId || card.dataset.productId || '';
    const name  = (card.querySelector('.productCard__name')?.textContent || '').trim();
    const price = numFromText(card.querySelector('.productCard__price')?.textContent || '0');

    const srcImg = card.querySelector('.productCard__thumb');
    if (srcImg && pImg) {
      pImg.alt = srcImg.alt || name;
      pImg.src = srcImg.src;
      if (srcImg.srcset) {
        pImg.srcset = srcImg.srcset;
        pImg.sizes  = '(min-width:768px) 50vw, 85vw';
      } else {
        pImg.removeAttribute('srcset');
        pImg.removeAttribute('sizes');
      }
    }

    current = { id, name, price, qty: 1, img: pImg?.src || '' };
    if (pName) pName.textContent = name;

    reflectQtyToOutput(qtyValueEl, current.qty);
    toggleStepBtnState(qtyMinus, qtyPlus, current.qty);

    openLayer(sheet);
  }

  if (qtyMinus && qtyValueEl) {
    qtyMinus.addEventListener('click', () => {
      current.qty = Math.max(MIN_QTY, (current.qty||1) - 1);
      reflectQtyToOutput(qtyValueEl, current.qty);
      toggleStepBtnState(qtyMinus, qtyPlus, current.qty);
    });
  }
  if (qtyPlus && qtyValueEl) {
    qtyPlus.addEventListener('click', () => {
      current.qty = Math.min(MAX_QTY, (current.qty||1) + 1);
      reflectQtyToOutput(qtyValueEl, current.qty);
      toggleStepBtnState(qtyMinus, qtyPlus, current.qty);
    });
  }

  if (!addBtn && sheet) {
    const body = sheet.querySelector('.cartSheet__body');
    if (body) {
      addBtn = document.createElement('button');
      addBtn.id = 'addToCartBtn';
      addBtn.type = 'button';
      addBtn.className = 'cartPrimaryBtn';
      addBtn.style.marginTop = '12px';
      addBtn.textContent = 'カートに入れる';
      const wrap = document.createElement('div');
      wrap.className = 'cartPrimaryBtn__Container';
      wrap.appendChild(addBtn);
      body.appendChild(wrap);
    }
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (addLock) return;
      addLock = true; setTimeout(() => (addLock = false), ADD_LOCK_MS);

      const totals = Store.add(current.id || current.name, current.qty || 1, {
        name:  current.name,
        price: current.price,
        img:   current.img
      });
      if (typeof window.updateCartBadge === 'function') window.updateCartBadge();

      closeLayer(sheet);
      window.openCartConfirm(totals);

      if (typeof window.refreshCartPage === 'function') {
        window.refreshCartPage();
      }
    });
  }

  function addDirectFromDetail(btn){
    const inDetail = !!btn.closest('.productDetail');
    const isDirect = btn.dataset.addDirect === 'true' || inDetail;
    if (!isDirect) return false;

    const wrap     = btn.closest('.productDetail') || document;
    const id       = btn.dataset.productId || wrap.querySelector('[data-product-id]')?.dataset.productId || '';
    const name     = (wrap.querySelector('.productDetail__title')?.textContent || '').trim()
                  || (wrap.querySelector('.productCard__name')?.textContent || '').trim();
    const priceNum = numFromText(wrap.querySelector('.productCard__price')?.textContent || '');
    const imgEl    = wrap.querySelector('.productDetail__mainImg img') || wrap.querySelector('.productCard__thumb');
    const imgSrc   = imgEl?.src || '';
    const qtyText  = (pdQtyValueEl?.textContent || pdQtyValueEl?.value || '').trim();
    const qty      = Math.max(MIN_QTY, Math.min(MAX_QTY, parseInt(qtyText || '1', 10) || 1));

    if (btn.classList.contains('is-disabled') || btn.hasAttribute('disabled')) return true;

    if (addLock) return true;
    addLock = true; setTimeout(() => (addLock = false), ADD_LOCK_MS);

    const totals = Store.add(id || name, qty, { name, price: priceNum, img: imgSrc });
    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();

    window.openCartConfirm(totals);
    return true;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btnCart');
    if (!btn) return;

    e.preventDefault();
    if (isDuplicateClick(btn)) return;

    if (btn.disabled || btn.classList.contains('is-disabled')) return;

    if (addDirectFromDetail(btn)) return;

    openCartSheetFromButton(btn);
  });

  function getDetailQty() {
    const raw = (pdQtyValueEl?.textContent || pdQtyValueEl?.value || '1');
    return Math.max(MIN_QTY, Math.min(MAX_QTY, parseInt(raw, 10) || 1));
  }
  function setDetailQty(n) {
    const clamped = Math.max(MIN_QTY, Math.min(MAX_QTY, n|0));
    reflectQtyToOutput(pdQtyValueEl, clamped);
    toggleStepBtnState(pdQtyMinus, pdQtyPlus, clamped);
  }
  if (pdQtyValueEl) setDetailQty(getDetailQty());
  if (pdQtyMinus && pdQtyValueEl) {
    pdQtyMinus.addEventListener('click', () => setDetailQty(getDetailQty() - 1));
  }
  if (pdQtyPlus && pdQtyValueEl) {
    pdQtyPlus.addEventListener('click', () => setDetailQty(getDetailQty() + 1));
  }

  if (closeBtn)     closeBtn.addEventListener('click',   () => closeLayer(sheet));
  if (confirmClose) confirmClose.addEventListener('click',() => closeLayer(confirm));
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sheet   && !sheet.hidden)   closeLayer(sheet);
      if (confirm && !confirm.hidden) closeLayer(confirm);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (sheet   && !sheet.hidden)   closeLayer(sheet);
      if (confirm && !confirm.hidden) closeLayer(confirm);
    }
  });
  if (typeof window.refreshCartPage === 'function') {
    window.refreshCartPage();
  }
})();
