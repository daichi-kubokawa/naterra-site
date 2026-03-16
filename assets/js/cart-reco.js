(() => {
  'use strict';

  const PRODUCTS_JSON_PATH = './assets/data/products.json';
  const IMG_BASE_DIR       = './assets/images/products';
  const LOW_STOCK_THRESHOLD = 5;

  const $ = (s, r=document) => r.querySelector(s);
  const yen = (n) => (typeof n === 'number') ? `¥${n.toLocaleString('ja-JP')}` : '';

  function makeCard(p, tpl) {
    const frag = tpl.content.cloneNode(true);

    const linkThumb = frag.querySelector('.productCard__thumbWrap');
    const linkWhole = frag.querySelector('.productCard__link');
    const img       = frag.querySelector('.productCard__thumb');
    const nameEl    = frag.querySelector('.productCard__name');
    const stockEl   = frag.querySelector('.productCard__stock');
    const priceEl   = frag.querySelector('.productCard__price');
    const badge     = frag.querySelector('.badge--limited');

    const href = `./product-detail.html?id=${encodeURIComponent(p.id)}`;
    if (linkThumb) linkThumb.href = href;
    if (linkWhole) linkWhole.href = href;

    if (img) {
      const base = `${IMG_BASE_DIR}/${p.img}`;
      img.src    = `${base}-165.jpg`;
      img.srcset = `${base}-165.jpg 165w, ${base}-330.jpg 330w`;
      img.sizes  = '(max-width: 767px) 165px, 200px';
      img.alt    = p.name || '';
      img.loading = 'lazy';
    }

    if (nameEl)  nameEl.textContent  = p.name || '';
    if (priceEl) priceEl.textContent = yen(p.price);

    if (stockEl) {
      stockEl.textContent = '';
      stockEl.classList.remove('productCard__stock--none','productCard__stock--low','is-hidden');
      if (p.stock === 0) {
        stockEl.textContent = '在庫なし';
        stockEl.classList.add('productCard__stock--none');
      } else if (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD) {
        stockEl.textContent = '残りわずか';
        stockEl.classList.add('productCard__stock--low');
      } else {
        stockEl.classList.add('is-hidden');
      }
    }

    const isLimited =
      p.limited === true || p.limited === 'true' ||
      p.badge === 'limited' ||
      (Array.isArray(p.badges) && p.badges.includes('limited'));
    if (badge) badge.hidden = !isLimited;

    const li = frag.querySelector('.productCard') || document.createElement('li');
    const btnWrap = document.createElement('div');
    btnWrap.className = 'productCard__actions';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btnCart';
    btn.textContent = 'カートに入れる';
    btn.dataset.productId = p.id;
    if (p.stock === 0) {
      btn.classList.add('is-disabled');
      btn.setAttribute('disabled', 'true');
    }
    btnWrap.appendChild(btn);
    li.appendChild(btnWrap);

    return frag;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const grid = $('#homeNewGrid');
    const tpl  = $('#productCardTpl');
    if (!grid || !tpl) return;

    let data = {};
    try {
      const res = await fetch(PRODUCTS_JSON_PATH, { cache: 'no-cache' });
      if (!res.ok) throw new Error('fetch failed');
      data = await res.json();
    } catch (e) {
      console.warn('cart-reco: products.json の取得に失敗', e);
      return;
    }

    const all = Array.isArray(data.all) ? data.all : [];
    if (all.length === 0) {
      grid.innerHTML = '';
      return;
    }

    let candidates = [];
    if (Array.isArray(data.popular) && data.popular.length) {
      const map = new Map(all.map(x => [String(x.id), x]));
      candidates = data.popular.map(id => map.get(String(id))).filter(Boolean);
    } else {
      candidates = all.slice().sort((a,b) => (b.popularScore||0) - (a.popularScore||0));
      const enoughStock = candidates.filter(p => p.stock > LOW_STOCK_THRESHOLD);
      const top4 = (enoughStock.length >= 4 ? enoughStock.slice(0, 4) : candidates.slice(0, 4));
    }
    const top4 = candidates.slice(0, 4);

    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    top4.forEach(p => frag.appendChild(makeCard(p, tpl)));
    grid.appendChild(frag);
  });
})();
