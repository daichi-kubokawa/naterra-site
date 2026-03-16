(() => {
  'use strict';
  const { $, lockBackground, unlockBackground, armDocClickGuard, shouldIgnoreDocClick } = window.Ntr || {};

  if (!$) return;

  const btnOpenCat  = $('#btnOpenCategories');
  const sheetCat    = $('#sheetCategories');
  const overlayCat  = $('#overlayCategories');
  const btnCloseCat = $('#btnCloseCategories');

  const btnOpenSort = $('#btnOpenSort');
  const menuSort    = $('#menuSort');
  const sortLabel   = $('#currentSortLabel');

  if (btnOpenCat && sheetCat && overlayCat && btnCloseCat) {
    const openCat = () => {
      sheetCat.hidden = false;
      overlayCat.hidden = false;
      requestAnimationFrame(() => {
        sheetCat.classList.add('is-open');
        overlayCat.classList.add('is-open');
      });
      btnOpenCat.setAttribute('aria-expanded', 'true');
      lockBackground();
      armDocClickGuard(120);
    };
    const closeCat = () => {
      sheetCat.classList.remove('is-open');
      overlayCat.classList.remove('is-open');
      btnOpenCat.setAttribute('aria-expanded', 'false');
      const done = () => {
        sheetCat.hidden = true;
        overlayCat.hidden = true;
        sheetCat.removeEventListener('transitionend', done);
      };
      sheetCat.addEventListener('transitionend', done);
      setTimeout(done, 320);
      unlockBackground();
    };

    btnOpenCat.addEventListener('click', (e) => {
      e.preventDefault();
      sheetCat.hidden ? openCat() : closeCat();
    });
    btnCloseCat.addEventListener('click', (e) => { e.preventDefault(); closeCat(); });
    overlayCat.addEventListener('click', (e) => { if (e.target === overlayCat) closeCat(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetCat.hidden) closeCat(); });

    document.addEventListener('click', (e) => {
      if (sheetCat.hidden) return;
      if (shouldIgnoreDocClick && shouldIgnoreDocClick()) return;
      if (!e.target.closest('#sheetCategories') && !e.target.closest('#btnOpenCategories')) {
        closeCat();
      }
    });
  }

  if (btnOpenSort && menuSort) {
    const placeMenu = () => {
      const rect = btnOpenSort.getBoundingClientRect();
      menuSort.style.position = 'absolute';
      menuSort.style.top  = `${window.scrollY + rect.bottom + 6}px`;
      menuSort.style.left = '20px';
      menuSort.style.right = '20px';
    };

    const openSort = () => {
      placeMenu();
      menuSort.hidden = false;
      requestAnimationFrame(() => menuSort.classList.add('is-open'));
      btnOpenSort.setAttribute('aria-expanded', 'true');
      armDocClickGuard(120);
    };
    const closeSort = () => {
      menuSort.classList.remove('is-open');
      btnOpenSort.setAttribute('aria-expanded', 'false');
      const done = () => { menuSort.hidden = true; menuSort.removeEventListener('transitionend', done); };
      menuSort.addEventListener('transitionend', done);
      setTimeout(done, 240);
    };

    btnOpenSort.addEventListener('click', (e) => {
      e.preventDefault();
      menuSort.hidden ? openSort() : closeSort();
    });

    menuSort.addEventListener('click', (e) => {
      const item = e.target.closest('.sortMenu__item');
      if (!item) return;

      menuSort.querySelectorAll('.sortMenu__item').forEach(b =>
        b.setAttribute('aria-checked', String(b === item))
      );
      if (sortLabel) sortLabel.textContent = item.textContent.trim();

      const sortKey = item.dataset.sort;
      if (typeof window.applySort === 'function') window.applySort(sortKey);

      closeSort();
    });

    document.addEventListener('click', (e) => {
      if (menuSort.hidden) return;
      if (shouldIgnoreDocClick && shouldIgnoreDocClick()) return;
      if (!e.target.closest('#menuSort') && !e.target.closest('#btnOpenSort')) {
        closeSort();
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuSort.hidden) closeSort(); });

    const rePlaceIfOpen = () => { if (!menuSort.hidden) placeMenu(); };
    window.addEventListener('scroll', rePlaceIfOpen, { passive: true });
    window.addEventListener('resize', rePlaceIfOpen);
  }
})();
