(() => {
  'use strict';

  const LS_KEY = 'naterra_cart';
  const MIN_QTY = 1;
  const MAX_QTY = 99;
  const FREE_SHIPPING_THRESHOLD = 5000;

  const Store = (function ensureStore(){
    if (window.Store && typeof window.Store.read === 'function') return window.Store;
    const Fallback = {
      read(){
        try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
        catch(e){ return {}; }
      },
      write(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj || {})); },
      setQty(id, qty){
        const q = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(qty)||0));
        const cart = this.read();
        if (cart[id]) { cart[id].qty = q; this.write(cart); }
        return this.totals();
      },
      add(id, qty, { name='', price=0, img='' }={}){
        if (!id) return this.totals();
        const cart = this.read();
        const cur = cart[id] || { qty:0, name, price:Number(price)||0, img };
        cur.qty += Number(qty)||0;
        if (name)  cur.name  = name;
        if (img)   cur.img   = img;
        if (price) cur.price = Number(price)||cur.price;
        cart[id] = cur;
        this.write(cart);
        return this.totals();
      },
      remove(id){
        const cart = this.read();
        if (id in cart) { delete cart[id]; this.write(cart); }
        return this.totals();
      },
      clear(){ this.write({}); },
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
      }
    };
    window.Store = Fallback;
    return Fallback;
  })();

  const $  = (s, r=document) => r.querySelector(s);
  const yen = (n) => '¥' + (Number(n)||0).toLocaleString('ja-JP');

  const wrap       = $('#cartContainer');
  const emptyView  = $('#cartEmpty');
  const sumBox     = $('#cartSummary');
  const subtotalEl = $('#cartSubtotal');
  let freeShipEl   = $('#cartFreeShipRemain');
  let shipNoteEl   = null;

  function updateRecommendSection() {
    const cartContainer = document.getElementById('cartContainer');
    const recommendSection = document.querySelector('section.products[aria-labelledby="cart-recommend-title"]');
    const hasItems = cartContainer && cartContainer.children.length > 0;
    if (recommendSection) {
      recommendSection.style.display = hasItems ? '' : 'none';
    }
  }

  function reflectStepState(qtyBox, n){
    if (!qtyBox) return;
    const minusBtn = qtyBox.querySelector('button[data-action="minus"]');
    const plusBtn  = qtyBox.querySelector('button[data-action="plus"]');
    if (minusBtn) {
      const dis = n <= MIN_QTY;
      minusBtn.disabled = dis;
      minusBtn.classList.toggle('is-disabled', dis);
    }
    if (plusBtn) {
      const dis = n >= MAX_QTY;
      plusBtn.disabled = dis;
      plusBtn.classList.toggle('is-disabled', dis);
    }
  }

  function render() {
    const cartObj = Store.read();
    const ids = Object.keys(cartObj);

    if (ids.length === 0) {
      wrap.innerHTML = '';
      if (emptyView) emptyView.hidden = false;
      if (sumBox)    sumBox.hidden = true;

      if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
      updateRecommendSection();

      return;
    } else {
      if (emptyView) emptyView.hidden = true;
      if (sumBox)    sumBox.hidden = false;
    }

    wrap.innerHTML = '';
    let subtotal = 0;

    ids.forEach(id => {
      const it = cartObj[id];
      const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(it.qty)||1));
      const price = Number(it.price)||0;
      const amount = qty * price;
      subtotal += amount;

      const row = document.createElement('article');
      row.className = 'cartRow';
      row.dataset.id = id;

      const imgDiv = document.createElement('div');
      imgDiv.className = 'cartRow__thumb';
      const img = document.createElement('img');
      img.alt = it.name || '';
      const src = (it.img || '').replace('-165.jpg','-330.jpg');
      img.src = src || (it.img || '');
      img.loading = 'lazy';
      imgDiv.appendChild(img);

      const body = document.createElement('div');
      body.className = 'cartRow__body';

      const name = document.createElement('p');
      name.className = 'cartRow__name';
      name.textContent = it.name || '';
      body.appendChild(name);

      const unit = document.createElement('p');
      unit.className = 'cartRow__unit';
      unit.textContent = `${yen(price)} / 1点`;
      body.appendChild(unit);

      const controls = document.createElement('div');
      controls.className = 'cartControls';
      controls.innerHTML = `
        <div class="cartQty__box">
          <button type="button" class="cartQty__btn" data-action="minus" aria-label="数量を1減らす">
            <img class="reductionIcon" src="./assets/images/icon/reduction.svg" alt="" aria-hidden="true">
          </button>
          <output class="cartQty__value" role="status" aria-live="polite">${qty}</output>
          <button type="button" class="cartQty__btn" data-action="plus" aria-label="数量を1増やす">
            <img class="addIcon" src="./assets/images/icon/add.svg" alt="" aria-hidden="true">
          </button>
        </div>
        <button type="button" class="cartRow__remove" data-action="remove" aria-label="商品を削除">削除</button>
      `;
      body.appendChild(controls);

      const right = document.createElement('div');
      right.className = 'cartRow__right';
      right.innerHTML = `
        <p class="cartRow__label">小計　税込</p>
        <p class="cartRow__amount">${yen(amount)}</p>
      `;
      body.appendChild(right);

      row.appendChild(imgDiv);
      row.appendChild(body);
      wrap.appendChild(row);

      reflectStepState(controls.querySelector('.cartQty__box'), qty);
    });

    if (subtotalEl) subtotalEl.textContent = yen(subtotal);

    if (!shipNoteEl) {
      shipNoteEl = document.createElement('span');
      shipNoteEl.id = 'cartShipNote';
      shipNoteEl.className = 'cart__shipNote';
    }
    if (subtotalEl && shipNoteEl) {
      subtotalEl.insertAdjacentElement('afterend', shipNoteEl);
    }

    if (!freeShipEl) {
      freeShipEl = document.createElement('p');
      freeShipEl.id = 'cartFreeShipRemain';
      freeShipEl.className = 'cart__remain';
    }
    if (sumBox) {
      const anchor = subtotalEl?.parentElement || subtotalEl;
      if (anchor && freeShipEl) {
        anchor.insertAdjacentElement('afterend', freeShipEl);
      } else {
        sumBox.appendChild(freeShipEl);
      }
    }

    const remain = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

    if (remain > 0) {
      shipNoteEl.textContent = ' + 送料';
      shipNoteEl.classList.remove('is-hidden');

      freeShipEl.textContent = `あと ${yen(remain)} で、送料無料`;
      freeShipEl.classList.remove('is-free');
    } else {
      shipNoteEl.textContent = '';
      shipNoteEl.classList.add('is-hidden');

      freeShipEl.textContent = '送料無料';
      freeShipEl.classList.add('is-free');
    }

    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    updateRecommendSection();
  }

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const row = btn.closest('.cartRow');
    if (!row) return;
    const id = row.dataset.id;
    const action = btn.dataset.action;

    const qtyOut = row.querySelector('.cartQty__value');
    let current = parseInt(qtyOut?.textContent || '1', 10) || 1;

    if (action === 'minus') {
      current = Math.max(MIN_QTY, current - 1);
      Store.setQty(id, current);
      render();
    }
    if (action === 'plus') {
      current = Math.min(MAX_QTY, current + 1);
      Store.setQty(id, current);
      render();
    }
    if (action === 'remove') {
      const ok = window.confirm('この商品をカートから削除しますか？');
      if (!ok) return;
      Store.remove(id);
      render();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    render();
  });

  window.refreshCartPage = render;
})();
