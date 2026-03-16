(() => {
  'use strict';

  const PRODUCTS_LIST_JSON = './assets/data/products.json';
  const PRODUCT_DETAIL_DIR = './assets/data/products/';
  const IMG_BASE_DIR       = './assets/images/products';

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function getIdFromQuery() {
    const id = new URLSearchParams(location.search).get('id') || '';
    return id.trim();
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
    return await res.json();
  }

  function yen(n) {
    return typeof n === 'number' ? `¥${n.toLocaleString('ja-JP')}` : '';
  }

  function renderImages({ imgBase, images, name }) {
    const main = $('#pdMainImg');
    const thumbsUl = $('#pdThumbList');
    thumbsUl.innerHTML = '';

    const sources = Array.isArray(images) && images.length > 0
      ? images.map(x => ({ src: x.src, alt: x.alt || name }))
      : [{ src: `${imgBase}-660.jpg`, alt: name }];

    const first = sources[0];
    main.src    = `${IMG_BASE_DIR}/${first.src}`;
    main.alt    = first.alt || name;
    main.srcset = `${IMG_BASE_DIR}/${first.src} 660w, ${IMG_BASE_DIR}/${imgBase}-330.jpg 330w`;
    main.sizes  = '(max-width: 767px) 100vw, 660px';

    sources.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = 'productDetail__thumbItem';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'productDetail__thumbBtn' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('aria-label', `画像${i+1}を表示`);
      const img = document.createElement('img');
      const baseNoExt = s.src.replace(/\.\w+$/, '');
      img.src    = `${IMG_BASE_DIR}/${baseNoExt}.jpg`.replace('-660', '-165');
      img.srcset = `${IMG_BASE_DIR}/${baseNoExt}.jpg 165w, ${IMG_BASE_DIR}/${baseNoExt.replace('-660','-330')}.jpg 330w`;
      img.sizes  = '(max-width: 767px) 80px, 110px';
      img.alt    = s.alt || name;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        $$('.productDetail__thumbBtn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        main.src    = `${IMG_BASE_DIR}/${s.src}`;
        main.srcset = `${IMG_BASE_DIR}/${s.src} 660w, ${IMG_BASE_DIR}/${imgBase}-330.jpg 330w`;
        main.alt    = s.alt || name;
      });
      li.appendChild(btn);
      thumbsUl.appendChild(li);
    });
  }

  function renderSpecs(specs = []) {
    const dl = $('#pdSpecList');
    dl.innerHTML = '';
    if (!Array.isArray(specs) || specs.length === 0) {
      dl.innerHTML = '<p class="pdSpecList__empty">仕様情報は準備中です。</p>';
      return;
    }
    specs.forEach(({ label, value }) => {
      const dt = document.createElement('dt');
      dt.className = 'pdSpecList__term';
      dt.textContent = label || '';
      const dd = document.createElement('dd');
      dd.className = 'pdSpecList__desc';
      dd.textContent = value || '';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const id = getIdFromQuery();
    const bcCurrent = $('#breadcrumbCurrent');
    if (bcCurrent) bcCurrent.textContent = '商品詳細';

    if (!id) {
      $('#pdName').textContent = '商品が見つかりませんでした';
      return;
    }

    let base = null;
    try {
      const list = await fetchJSON(PRODUCTS_LIST_JSON);
      const all  = Array.isArray(list.all) ? list.all : [];
      base = all.find(p => String(p.id) === id) || null;
    } catch (e) {
      console.warn(e);
    }

    let detail = {};
    try {
      detail = await fetchJSON(`${PRODUCT_DETAIL_DIR}${id}.json`);
    } catch (e) {
      console.warn('detail json not found, fallback to list only', e);
    }

    const product = Object.assign({}, base || {}, detail || {});
    if (!product.id) product.id = id;

    const imgBase = product.imgBase || product.img || product.id;
    product.imgBase = imgBase;

    $('#productDetailCard').dataset.productId = product.id;
    $('#pdName').textContent = product.name || '';
    $('#pdCodeValue').textContent = (product.id || '').replace(/^p/i, '').padStart(6, '0');

    if (product.name) document.title = `${product.name} | Naterra`;
    if (bcCurrent && product.name) bcCurrent.textContent = product.name;

    $('#pdPrice').textContent = yen(product.price);

    const $stock = $('#pdStock');
    if ($stock) {
      const stockNum = Number(product.stock ?? 0);

      $stock.classList.remove(
        'productCard__stock--none','productCard__stock--low','is-hidden',
        'productDetail__stock--none','productDetail__stock--low'
      );

      if (stockNum <= 0) {
        $stock.textContent = '在庫なし';
        $stock.classList.add('productDetail__stock--none');
        $stock.style.display = '';
      } else if (stockNum <= 5) {
        $stock.textContent = `残り${stockNum}点`;
        $stock.classList.add('productDetail__stock--low');
        $stock.style.display = '';
      } else {
        $stock.textContent = '';
        $stock.classList.add('is-hidden');
        $stock.style.display = 'none';
      }
    }

    $('#pdBadge').hidden = !(product.limited === true || product.limited === 'true');

    renderImages({
      imgBase: product.imgBase,
      images:  product.images,
      name:    product.name
    });

    if (product.description) {
      if (product.description.title) $('#pdDescTitle').textContent = product.description.title;
      if (product.description.body)  $('#pdDesc').textContent       = product.description.body;
    }

    renderSpecs(product.specs);

    const btnAdd = $('#pdAddToCart');
    if (btnAdd) {
      btnAdd.dataset.productId  = product.id;
      btnAdd.dataset.addDirect  = 'true';

      if (Number(product.stock ?? 0) <= 0) {
        btnAdd.disabled = true;
        btnAdd.classList.add('is-disabled');
      }
    }

    const catMap = {
      fabric:   { name: '布雑貨',         href: './products-fabric.html' },
      kitchen:  { name: 'キッチン',       href: './products-kitchen.html' },
      interior: { name: 'インテリア',     href: './products-interior.html' },
      relax:    { name: 'バス・リラックス', href: './products-relax.html' },
      storage:  { name: '収納・かご',     href: './products-storage.html' }
    };
    const cat = catMap[product.category];
    if (cat) {
      const li = $('#breadcrumbCategory');
      if (li) li.innerHTML = `<a href="${cat.href}">${cat.name}</a>`;
    }

    const out   = $('#pdQtyValue');
    const minus = $('#pdQtyMinus');
    const plus  = $('#pdQtyPlus');
    const minQ = 1, maxQ = 99;

    let qty = Math.min(Math.max(parseInt(out?.textContent || '1', 10) || 1, minQ), maxQ);
    const updateQty = (n) => {
      qty = Math.min(Math.max(n, minQ), maxQ);
      if (out) out.textContent = String(qty);
    };
    if (minus) minus.addEventListener('click', () => updateQty(qty - 1));
    if (plus)  plus .addEventListener('click', () => updateQty(qty + 1));
  });
})();
