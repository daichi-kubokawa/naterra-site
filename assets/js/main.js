(() => {
    'use strict';

    const LOW_STOCK_THRESHOLD = 5;
    const PRODUCTS_JSON_PATH = './assets/data/products.json';

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    document.addEventListener('DOMContentLoaded', async () => {
        const tpl     = $('#productCardTpl');
        const gridNew = $('#productGridNew');
        const gridPop = $('#productGridPopular');
        if (!tpl) return;

        const data = await loadProductsData();
        renderProducts(data.new || [], gridNew, tpl);
        renderProducts(data.popular || [], gridPop, tpl);
    });

    async function loadProductsData() {
        try {
            const res = await fetch(PRODUCTS_JSON_PATH, { cache: 'no-cache' });
            if (!res.ok) throw new Error('JSON fetch failed');
            return await res.json();
        } catch (err) {
            const embedded = $('#productsData');
            if (embedded && embedded.textContent.trim()) {
                try {
                    return JSON.parse(embedded.textContent);
                } catch (_) {
                    console.warn('Embedded JSON parse failed');
                }
            }
            console.warn('Products data fallback: empty');
            return { new: [], popular: [] };
        }
    }

    function renderProducts(list, container, templateEl) {
        if (!container || !templateEl) return;
        list.forEach((p) => {
            const node = templateEl.content.cloneNode(true);

            const img  = node.querySelector('.productCard__thumb');
            const base = `./assets/images/products/${p.id}`;
            if (img) {
                img.src = `${base}-165.jpg`;
                img.srcset = `${base}-165.jpg 165w, ${base}-330.jpg 330w`;
                img.sizes = '(max-width: 767px) 165px, 200px';
                img.alt = p.name || '';
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
                } else if (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD) {
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

            const linkEl = node.querySelector('.productCard__link');
            if (linkEl) linkEl.href = './index.html';

            container.appendChild(node);
        });
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.favBtn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const img = btn.querySelector('.favIcon');
        const on  = btn.dataset.srcOn  || './assets/images/icon/favorite-on.svg';
        const off = btn.dataset.srcOff || './assets/images/icon/favorite-off.svg';

        const isOn = btn.classList.toggle('is-on');
        if (img) img.src = isOn ? on : off;
        btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }, { passive: false });

    document.addEventListener('DOMContentLoaded', () => {
        const root    = document.documentElement;
        const drawer  = $('[data-nav-drawer]');
        const overlay = $('[data-nav-overlay]');
        const openBtn = $('[data-nav-open]');
        const burger  = $('#btn03');

        if (!drawer || !overlay || !openBtn) return;

        const openNav = () => {
            drawer.hidden  = false;
            overlay.hidden = false;

            requestAnimationFrame(() => {
                drawer.classList.add('is-open');
                overlay.classList.add('is-open');
            });

            root.classList.add('is-nav-open');
            openBtn.setAttribute('aria-expanded', 'true');
            drawer.setAttribute('aria-hidden', 'false');
            if (burger) burger.classList.add('active');
        };

        const closeNav = () => {
            drawer.classList.remove('is-open');
            overlay.classList.remove('is-open');
            root.classList.remove('is-nav-open');
            openBtn.setAttribute('aria-expanded', 'false');
            drawer.setAttribute('aria-hidden', 'true');
            if (burger) burger.classList.remove('active');

            const done = () => {
                drawer.hidden  = true;
                overlay.hidden = true;
                drawer.removeEventListener('transitionend', done);
            };
            drawer.addEventListener('transitionend', done);
            setTimeout(done, 500);
        };

        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-nav-open]')) {
                e.preventDefault();
                drawer.classList.contains('is-open') ? closeNav() : openNav();
                return;
            }
            if (e.target === overlay || e.target.closest('[data-nav-close]')) {
                e.preventDefault();
                closeNav();
                return;
            }
            if (e.target.closest('.navDrawer .menuItem[href]')) {
                closeNav();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
                closeNav();
            }
        });

        const animateSubmenu = (ul, open) => {
            if (ul.hasAttribute('hidden')) ul.removeAttribute('hidden');
            const currentH = ul.getBoundingClientRect().height;
            ul.style.maxHeight = currentH + 'px';
            requestAnimationFrame(() => {
                if (open) {
                    const targetH = ul.scrollHeight;
                    ul.classList.add('is-open');
                    ul.style.maxHeight = targetH + 'px';
                    const done = () => {
                        ul.style.maxHeight = 'none';
                        ul.removeEventListener('transitionend', done);
                    };
                    ul.addEventListener('transitionend', done, { once: true });
                } else {
                    const natural = ul.scrollHeight;
                    ul.style.maxHeight = natural + 'px';
                    requestAnimationFrame(() => {
                        ul.classList.remove('is-open');
                        ul.style.maxHeight = '0px';
                    });
                }
            });
        };

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cat-toggle], .menuItem--toggle');
            if (!btn) return;

            const li      = btn.closest('li');
            const submenu = li ? $('.submenu', li) : null;
            if (!submenu) return;

            const expanded = btn.getAttribute('aria-expanded') === 'true';
            const nextOpen = !expanded;

            btn.setAttribute('aria-expanded', String(nextOpen));
            animateSubmenu(submenu, nextOpen);
        });
    });
})();

document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#btn03');
    if (trigger) {
        trigger.classList.toggle('active');
    }
});
