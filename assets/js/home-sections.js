(() => {
  'use strict';

  const PRODUCTS_JSON_PATH = './assets/data/products.json';
  const IMG_BASE_DIR       = './assets/images/products';
  const MAX_HOME_ITEMS     = 4;
  const DETAIL_PAGE_PATH   = './product-detail.html';

  const $ = (s, r=document) => r.querySelector(s);

  function renderHomeCards(list, grid, tpl) {
    grid.innerHTML = '';
    list.forEach(p => {
      const node = tpl.content.cloneNode(true);

      const linkThumb = node.querySelector('.productCard__thumbWrap') || node.querySelector('.productCard__link');
      const img       = node.querySelector('.productCard__thumb');
      const nameEl    = node.querySelector('.productCard__name');
      const stockEl   = node.querySelector('.productCard__stock');
      const priceEl   = node.querySelector('.productCard__price');
      const badge     = node.querySelector('.badge--limited');
      const cta       = node.querySelector('.productCard__cta');

      const base = `${IMG_BASE_DIR}/${p.img}`;

      if (img) {
        img.src    = `${base}-165.jpg`;
        img.srcset = `${base}-165.jpg 165w, ${base}-330.jpg 330w`;
        img.sizes  = '(max-width: 767px) 165px, 200px';
        img.alt    = p.name || '';
      }

      const detailUrl = `${DETAIL_PAGE_PATH}?id=${encodeURIComponent(p.id)}`;
      if (linkThumb) linkThumb.href = detailUrl;

      if (nameEl)  nameEl.textContent  = p.name || '';
      if (priceEl) priceEl.textContent = (typeof p.price === 'number') ? `¥${p.price.toLocaleString('ja-JP')}` : '';

      if (stockEl) {
        stockEl.textContent = '';
        stockEl.classList.remove('productCard__stock--none', 'productCard__stock--low', 'is-hidden');
        if (p.stock === 0) {
          stockEl.textContent = '在庫なし';
          stockEl.classList.add('productCard__stock--none');
        } else if (p.stock > 0 && p.stock <= 5) {
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

      if (cta) cta.remove();

      grid.appendChild(node);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const gridNew     = $('#homeNewGrid');
    const gridPopular = $('#homePopularGrid');
    const tpl         = $('#homeProductCardTpl');
    if (!gridNew || !gridPopular || !tpl) return;

    let data = {};
    try {
      const res = await fetch(PRODUCTS_JSON_PATH, { cache: 'no-cache' });
      if (!res.ok) throw new Error('fetch failed');
      data = await res.json();
    } catch (e) {
      console.error('[home] JSON 読み込み失敗', e);
      return;
    }

    const all = Array.isArray(data.all) ? data.all : [];
    const home = data.home || {};
    const pickNewIds = Array.isArray(home.new) ? home.new : [];
    const pickPopIds = Array.isArray(home.popular) ? home.popular : [];

    const byId = new Map(all.map(p => [String(p.id), p]));
    const newList = pickNewIds.map(id => byId.get(String(id))).filter(Boolean).slice(0, MAX_HOME_ITEMS);
    const popList = pickPopIds.map(id => byId.get(String(id))).filter(Boolean).slice(0, MAX_HOME_ITEMS);

    renderHomeCards(newList, gridNew, tpl);
    renderHomeCards(popList, gridPopular, tpl);
  });
})();
