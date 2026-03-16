(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      const tabs   = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

      function activateTab(tab) {
        tabs.forEach(t => {
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
          t.classList.remove('is-active');
        });
        panels.forEach(p => { p.hidden = true; p.classList.remove('is-active'); });

        tab.setAttribute('aria-selected', 'true');
        tab.removeAttribute('tabindex');
        tab.classList.add('is-active');

        const id = tab.getAttribute('aria-controls');
        const panel = id ? document.getElementById(id) : null;
        if (panel) {
          panel.hidden = false;
          panel.classList.add('is-active');
        }
      }

      const first = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
      if (first) activateTab(first);

      tabs.forEach(tab => {
        tab.addEventListener('click', e => {
          e.preventDefault();
          activateTab(tab);
        });
      });

      tablist.addEventListener('keydown', e => {
        const idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        let next = idx;
        if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else return;
        e.preventDefault();
        tabs[next].focus();
        activateTab(tabs[next]);
      });

      return;
    }

    const tabs  = Array.from(document.querySelectorAll('.pdTab'));
    const panes = Array.from(document.querySelectorAll('.pdPane'));
    if (!tabs.length || !panes.length) return;

    function getPaneForTab(tab, index) {
      const sel = tab.getAttribute('data-target');
      if (sel) return document.querySelector(sel);
      return panes[index] || null;
    }

    function activateByIndex(index) {
      tabs.forEach(t => t.classList.remove('is-active'));
      panes.forEach(p => p.classList.remove('is-active'));

      const tab = tabs[index];
      const pane = getPaneForTab(tab, index);
      if (tab)  tab.classList.add('is-active');
      if (pane) pane.classList.add('is-active');
    }

    let initialIndex = Math.max(0, tabs.findIndex(t => t.classList.contains('is-active')));
    if (initialIndex === -1) initialIndex = 0;
    activateByIndex(initialIndex);

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', e => {
        e.preventDefault();
        activateByIndex(i);
      });
    });

    const addToCartBtn = document.getElementById('addToCartBtn');
    if (stockCount === 0) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = '在庫なし';
      addToCartBtn.classList.add('is-disabled');
    }
  });
})();
