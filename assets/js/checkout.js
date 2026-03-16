(() => {
  'use strict';

  const LS_KEY = 'naterra_cart';
  const MIN_QTY = 1;
  const MAX_QTY = 99;
  const FREE_SHIPPING_THRESHOLD = 5000;
  const BASE_SHIPPING_FEE = 600;
  const VALID_COUPONS = {
    'NATERRA10': { type: 'rate', value: 0.10, label: '10% OFF' }
  };

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const yen = (n) => '¥' + (Number(n)||0).toLocaleString('ja-JP');

  const Store = {
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
    }
  };

  const form = $('#checkoutForm');
  const itemsUL = $('#coItems');
  const sumSubtotal = $('#sum-subtotal');
  const sumGift = $('#sum-gift');
  const sumShip = $('#sum-ship');
  const sumDiscount = $('#sum-discount');
  const sumTotal = $('#sum-total');
  const giftOpt = $('#giftOpt');
  const orderBtn = $('#orderBtn');
  const couponInput = $('#couponInput');
  const couponApply = $('#couponApply');
  const couponMsg = $('#couponMsg');
  const cardPanel = $('#cardPanel');
  const payRadios = $$('input[name="pay"]');
  const paypayDesc = $('#paypayDesc');
  const bankDesc = $('#bankDesc');

  let coupon = null;
  let shipMethod = 'home';

  function reflectQtyBtns(row, n){
    const minus = row.querySelector('[data-co-action="minus"]');
    const plus  = row.querySelector('[data-co-action="plus"]');
    if (minus) {
      const dis = n <= MIN_QTY;
      minus.disabled = dis;
      minus.classList.toggle('is-disabled', dis);
    }
    if (plus) {
      const dis = n >= MAX_QTY;
      plus.disabled = dis;
      plus.classList.toggle('is-disabled', dis);
    }
  }

  function togglePayPanels() {
    const checked = document.querySelector('input[name="pay"]:checked');
    const cardPanel = document.getElementById('cardPanel');
    const paypayDesc = document.getElementById('paypayDesc');
    const bankDesc = document.getElementById('bankDesc');
    if (checked) {
      if (checked.value === 'card') {
        cardPanel?.removeAttribute('hidden');
        paypayDesc?.setAttribute('style', 'display:none;');
        bankDesc?.setAttribute('style', 'display:none;');
      } else if (checked.value === 'paypay') {
        cardPanel?.setAttribute('hidden', 'hidden');
        paypayDesc?.setAttribute('style', 'display:block;');
        bankDesc?.setAttribute('style', 'display:none;');
      } else if (checked.value === 'bank') {
        cardPanel?.setAttribute('hidden', 'hidden');
        paypayDesc?.setAttribute('style', 'display:none;');
        bankDesc?.setAttribute('style', 'display:block;');
      } else {
        cardPanel?.setAttribute('hidden', 'hidden');
        paypayDesc?.setAttribute('style', 'display:none;');
        bankDesc?.setAttribute('style', 'display:none;');
      }
    }
  }

    function updateGiftFee() {
      let giftCount = 0;
      $$('select[name="itemCount"]', itemsUL).forEach(sel => {
        giftCount += Number(sel.value) || 0;
      });
      let giftFee = giftCount * 160;
      sumGift.textContent = yen(giftFee);

      let subtotal = 0;
      const cart = Store.read();
      Object.keys(cart).forEach(id => {
        const it = cart[id];
        const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(it.qty)||1));
        const price = Number(it.price)||0;
        subtotal += qty * price;
      });
      const underThreshold = subtotal < FREE_SHIPPING_THRESHOLD;
      const shipFee = (shipMethod === 'pickup') ? 0 : (underThreshold ? BASE_SHIPPING_FEE : 0);
      let discount = 0;
      if (coupon) {
        if (coupon.type === 'rate') discount = Math.floor(subtotal * coupon.value);
        if (coupon.type === 'amount') discount = Math.min(subtotal, coupon.value|0);
      }
      const total = Math.max(0, subtotal + giftFee + shipFee - discount);
      sumTotal.textContent = yen(total);
    }

  function render(){
    const cart = Store.read();
    const ids = Object.keys(cart);

    itemsUL.innerHTML = '';

    let subtotal = 0;
    ids.forEach((id) => {
      const it = cart[id];
      const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(it.qty)||1));
      const price = Number(it.price)||0;
      const amount = qty * price;
      subtotal += amount;

      let options = '';
      for (let i = 0; i <= qty; i++) {
        options += `<option value="${i}"${i === 0 ? ' selected' : ''}>${i}</option>`;
      }

      const li = document.createElement('li');
      li.className = 'coItem';
      li.dataset.id = id;
      li.innerHTML = `
        <div class="coItem__thumb"><img src="${(it.img||'').replace('-165.jpg','-330.jpg') || it.img || ''}" alt=""></div>
        <div class="coItem__body">
          <p class="coItem__name">${it.name || ''}</p>
          <p class="coItem__unit">¥${(price||0).toLocaleString('ja-JP')} / 1点</p>
          <div class="coItem__qty">
            <output class="coQtyVal">点数：${qty}</output>
          </div>
          <label class="coCtl"><span>ギフト包装：</span>
            <select required name="itemCount">
              ${options}
            </select>
            <span>（¥160/点）</span>
          </label>
          <div class="coItem__subtotal">
            <p class="coItem__tax">小計　税込</p>
            <p class="coItem__amt">${yen(amount)}</p>
          </div>
        </div>
      `;
      itemsUL.appendChild(li);
      reflectQtyBtns(li, qty);
    });

    $$('select[name="itemCount"]', itemsUL).forEach(sel => {
      sel.addEventListener('change', updateGiftFee);
    });

    updateGiftFee();

    let giftCount = 0;
    $$('select[name="itemCount"]', itemsUL).forEach(sel => {
      giftCount += Number(sel.value) || 0;
    });
    let giftFee = giftCount * 160;
    let subtotal2 = 0;
    ids.forEach((id) => {
      const it = cart[id];
      const qty = Math.max(MIN_QTY, Math.min(MAX_QTY, Number(it.qty)||1));
      const price = Number(it.price)||0;
      subtotal2 += qty * price;
    });
    const underThreshold = subtotal2 < FREE_SHIPPING_THRESHOLD;
    const shipFee = (shipMethod === 'pickup') ? 0 : (underThreshold ? BASE_SHIPPING_FEE : 0);
    let discount = 0;
    if (coupon) {
      if (coupon.type === 'rate') discount = Math.floor(subtotal2 * coupon.value);
      if (coupon.type === 'amount') discount = Math.min(subtotal2, coupon.value|0);
    }
    const total = Math.max(0, subtotal2 + giftFee + shipFee - discount);

    sumGift.textContent = yen(giftFee);
    sumSubtotal.textContent = yen(subtotal2);
    sumShip.textContent = yen(shipFee);
    sumDiscount.textContent = (discount > 0) ? ('- ' + yen(discount)) : '- ¥0';
    sumTotal.textContent = yen(total);

    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
  }

  document.addEventListener('change', (e) => {
    const r = e.target;
    if (r && r.name === 'shipMethod') {
      shipMethod = r.value;
      render();
    }
    if (r && r.name === 'pay') {
      togglePayPanels();
    }
  });

  couponApply?.addEventListener('click', () => {
    const code = (couponInput?.value || '').trim().toUpperCase();
    if (!code) {
      coupon = null;
      couponMsg.textContent = 'クーポンコードを入力してください。';
      render();
      return;
    }
    const def = VALID_COUPONS[code];
    if (!def) {
      coupon = null;
      couponMsg.textContent = '無効なクーポンコードです。';
      render();
      return;
    }
    coupon = { code, ...def };
    couponMsg.textContent = `${code} を適用しました（${def.label}）`;
    render();
  });

  document.addEventListener('DOMContentLoaded', () => {
    render();
    togglePayPanels();
    if (typeof window.updateCartBadge === 'function') window.updateCartBadge();

    giftOpt?.addEventListener('change', updateGiftFee);
  });

  orderBtn?.addEventListener('click', () => {
    const totals = Store.totals();
    if (totals.count === 0) {
      alert('カートが空です。');
      return;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.matches('.coInvalid')) e.target.classList.remove('coInvalid');
  });

  document.querySelectorAll('input[name="pay"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const rows = document.querySelectorAll('.coPayBox .coPayRow');
      const bankRow = rows[2];
      const bankRadio = bankRow.querySelector('input[type="radio"]');
      if (bankRadio.checked) {
        bankRow.style.borderBottom = '1px solid var(--textGlayColor)';
      } else {
        bankRow.style.borderBottom = 'none';
      }
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    const rows = document.querySelectorAll('.coPayBox .coPayRow');
    const bankRow = rows[2];
    const bankRadio = bankRow.querySelector('input[type="radio"]');
    if (bankRadio.checked) {
      bankRow.style.borderBottom = '1px solid var(--textGlayColor)';
    } else {
      bankRow.style.borderBottom = 'none';
    }
  });
})();
