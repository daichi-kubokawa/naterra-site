(() => {
  'use strict';

  const PRODUCTS_JSON_PATH   = './assets/data/products.json';
  const IMG_BASE_DIR         = './assets/images/products';
  const LOW_STOCK_THRESHOLD  = 5;
  const PAGE_SIZE            = 20;

  const $ = (sel, root = document) => root.querySelector(sel);

  function getQueryParams() {
    const p = new URLSearchParams(location.search);
    return {
      page: Math.max(1, parseInt(p.get('page') || '1', 10) || 1),
      cat:  (p.get('cat') || '').trim()
    };
  }

  function getActiveCategorySlug(grid) {
    const dataCat = grid?.dataset?.cat?.trim();
    if (dataCat) return dataCat;
    const { cat } = getQueryParams();
    return cat || '';
  }

  function setCountText(el, total, page, size) {
    const start = total === 0 ? 0 : (page - 1) * size + 1;
    const end   = Math.min(page * size, total);
    el.textContent = `${total}件中 ${start}件〜${end}件 表示`;
  }

  function buildPageHref(page, catSlug) {
    const url = new URL(location.href);
    url.searchParams.set('page', String(page));
    if (catSlug) url.searchParams.set('cat', catSlug);
    else url.searchParams.delete('cat');
    return url.pathname + url.search;
  }

  function renderPagination(ul, current, totalPages, catSlug) {
    ul.innerHTML = '';
    if (totalPages <= 1) return;

    const addItem = (label, page, {
      rel = '',
      currentPage = false,
      disabled = false,
      addClass = ''
    } = {}) => {
      const li = document.createElement('li');
      if (currentPage || disabled) {
        const span = document.createElement('span');
        span.textContent = label;
        if (addClass) span.classList.add(addClass);
        if (currentPage) {
          span.classList.add('is-current');
          span.setAttribute('aria-current', 'page');
        } else {
          span.classList.add('is-disabled');
          span.setAttribute('aria-disabled', 'true');
        }
        li.appendChild(span);
      } else {
        const a = document.createElement('a');
        a.textContent = label;
        a.href = buildPageHref(page, catSlug);
        if (rel) a.setAttribute('rel', rel);
        if (addClass) a.classList.add(addClass);
        li.appendChild(a);
      }
      ul.appendChild(li);
    };

    if (current > 1) addItem('‹', current - 1, { rel: 'prev', addClass: 'arrow' });

    const start = Math.max(1, current - 2);
    const end   = Math.min(totalPages, current + 2);
    for (let p = start; p <= end; p++) {
      addItem(String(p), p, { currentPage: p === current });
    }

    if (current < totalPages) addItem('›', current + 1, { rel: 'next', addClass: 'arrow' });
  }

  function renderProducts(list, container, templateEl) {
    const DETAIL_PAGE_PATH = './product-detail.html';

    container.innerHTML = '';
    list.forEach((p) => {
      const node = templateEl.content.cloneNode(true);

      const img        = node.querySelector('.productCard__thumb');
      const linkThumb  = node.querySelector('.productCard__thumbWrap');
      const linkWhole  = node.querySelector('.productCard__link');

      const base = `./assets/images/products/${p.img}`;
      if (img) {
        img.src    = `${base}-165.jpg`;
        img.srcset = `${base}-165.jpg 165w, ${base}-330.jpg 330w`;
        img.sizes  = '(max-width: 767px) 165px, 200px';
        img.alt    = p.name || '';
      }

      const detailUrl = `${DETAIL_PAGE_PATH}?id=${encodeURIComponent(p.id)}`;

      if (linkThumb) linkThumb.href = detailUrl;
      if (linkWhole) linkWhole.href = detailUrl;

      const badge = node.querySelector('.badge--limited');
      const isLimited =
        p.limited === true || p.limited === 'true' ||
        p.badge === 'limited' ||
        (Array.isArray(p.badges) && p.badges.includes('limited'));
      if (badge) {
        badge.hidden = !isLimited;
      } else if (isLimited) {
        const wrap = node.querySelector('.productCard__thumbWrap') || node.querySelector('.productCard__link');
        if (wrap) {
          const b = document.createElement('span');
          b.className = 'badge badge--limited';
          b.innerHTML = '数量<br>限定';
          wrap.appendChild(b);
        }
      }

      const nameEl = node.querySelector('.productCard__name');
      if (nameEl) nameEl.textContent = p.name || '';

      const stockEl = node.querySelector('.productCard__stock');
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

      const priceEl = node.querySelector('.productCard__price');
      if (priceEl) {
        priceEl.textContent = (typeof p.price === 'number')
          ? `¥${p.price.toLocaleString('ja-JP')}` : '';
      }

      const btn = node.querySelector('.btnCart');
      if (btn) {
        btn.dataset.productId = p.id;
        btn.textContent = 'カートに入れる';
        if (p.stock === 0) {
          btn.classList.add('is-disabled');
          btn.setAttribute('disabled', 'true');
        } else {
          btn.classList.remove('is-disabled');
          btn.removeAttribute('disabled');
        }
      }

      container.appendChild(node);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const grid    = $('#productGridAll, #productGridNew, #productGridPopular');
    const tpl     = $('#productCardTpl');
    const countEl = $('#productsCount');
    const pagerUl = $('#paginationList');
    if (!grid || !tpl || !countEl || !pagerUl) return;

    let listType = 'all';
    if (grid.id === 'productGridNew')     listType = 'new';
    if (grid.id === 'productGridPopular') listType = 'popular';

    let data = {};
    try {
      const res = await fetch(PRODUCTS_JSON_PATH, { cache: 'no-cache' });
      if (!res.ok) throw new Error('fetch failed');
      data = await res.json();
    } catch (e) {
      console.warn('Products JSON fallback: empty', e);
      data = {};
    }

    const allArr = Array.isArray(data.all) ? data.all : [];
    const map = new Map(allArr.map(item => [String(item.id), item]));

    const resolveIds = (ids) => {
      if (!Array.isArray(ids)) return [];
      const out = [];
      ids.forEach(id => {
        const it = map.get(String(id));
        if (it) out.push(it);
      });
      return out;
    };

    let baseProducts;
    if (listType === 'new') {
      const ids = Array.isArray(data.new) ? data.new : [];
      baseProducts = ids.length ? resolveIds(ids)
        : allArr.slice().sort((a, b) => (new Date(b.createdAt||0)) - (new Date(a.createdAt||0)));
    } else if (listType === 'popular') {
      const ids = Array.isArray(data.popular) ? data.popular : [];
      baseProducts = ids.length ? resolveIds(ids)
        : allArr.slice().sort((a, b) => (b.popularScore||0) - (a.popularScore||0));
    } else {
      baseProducts = allArr;
    }

    const { page } = getQueryParams();
    const catSlug  = getActiveCategorySlug(grid);
    let filtered   = catSlug ? baseProducts.filter(p => String(p.category) === catSlug) : baseProducts;

    const state = {
      listType,
      pageSize: PAGE_SIZE,
      currentPage: Math.max(1, page || 1),
      currentSort: 'new',
      allProducts: filtered,
      activeCat:   catSlug,
      grid, tpl, countEl, pagerUl
    };

    function getSorted(products, sortKey) {
      const arr = products.slice();
      switch (sortKey) {
        case 'priceAsc':
          arr.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'priceDesc':
          arr.sort((b, a) => (a.price || 0) - (b.price || 0));
          break;
        case 'popular':
          arr.sort((a, b) => (b.popularScore || 0) - (a.popularScore||0));
          break;
        case 'new':
        default:
          arr.sort((a, b) => (new Date(b.createdAt||0)) - (new Date(a.createdAt||0)));
          break;
      }
      return arr;
    }

    function recomputeAndRender() {
      const total = state.allProducts.length;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);

      setCountText(state.countEl, total, state.currentPage, state.pageSize);

      const sorted   = getSorted(state.allProducts, state.currentSort);
      const startIdx = (state.currentPage - 1) * state.pageSize;
      const pageList = sorted.slice(startIdx, startIdx + state.pageSize);

      if (pageList.length === 0) {
        state.grid.innerHTML = '<li>該当する商品がありません。</li>';
      } else {
        renderProducts(pageList, state.grid, state.tpl);
      }

      renderPagination(state.pagerUl, state.currentPage, totalPages, state.activeCat);
    }

    recomputeAndRender();

    window.applySort = function(sortKey) {
      state.currentSort = sortKey || 'new';
      state.currentPage = 1;
      recomputeAndRender();
    };

    window.NaterraListState = state;
    if (!window.NaterraCards) window.NaterraCards = {};
    window.NaterraCards.render = renderProducts;
  });
})();
