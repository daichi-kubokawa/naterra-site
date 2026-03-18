(() => {
  "use strict";

  const {
    $,
    lockBackground,
    unlockBackground,
    armDocClickGuard,
    shouldIgnoreDocClick,
  } = window.Ntr || {};

  if (!$) return;

  const btnOpenCat = $("#btnOpenCategories");
  const sheetCat = $("#sheetCategories");
  const overlayCat = $("#overlayCategories");
  const btnCloseCat = $("#btnCloseCategories");

  const btnOpenSort = $("#btnOpenSort");
  const sheetSort = $("#sheetSort");
  const overlaySort = $("#overlaySort");
  const btnCloseSort = $("#btnCloseSort");
  const sortLabel = $("#currentSortLabel");

  /* =========================
     Category Sheet
  ========================= */
  if (btnOpenCat && sheetCat && overlayCat && btnCloseCat) {
    const openCat = () => {
      sheetCat.hidden = false;
      overlayCat.hidden = false;

      requestAnimationFrame(() => {
        sheetCat.classList.add("is-open");
        overlayCat.classList.add("is-open");
      });

      btnOpenCat.setAttribute("aria-expanded", "true");
      lockBackground?.();
      armDocClickGuard?.(120);
    };

    const closeCat = () => {
      sheetCat.classList.remove("is-open");
      overlayCat.classList.remove("is-open");
      btnOpenCat.setAttribute("aria-expanded", "false");

      const done = () => {
        sheetCat.hidden = true;
        overlayCat.hidden = true;
        sheetCat.removeEventListener("transitionend", done);
      };

      sheetCat.addEventListener("transitionend", done);
      setTimeout(done, 320);
      unlockBackground?.();
    };

    btnOpenCat.addEventListener("click", (e) => {
      e.preventDefault();
      sheetCat.hidden ? openCat() : closeCat();
    });

    btnCloseCat.addEventListener("click", (e) => {
      e.preventDefault();
      closeCat();
    });

    overlayCat.addEventListener("click", (e) => {
      if (e.target === overlayCat) closeCat();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheetCat.hidden) closeCat();
    });

    document.addEventListener("click", (e) => {
      if (sheetCat.hidden) return;
      if (shouldIgnoreDocClick?.()) return;

      if (
        !e.target.closest("#sheetCategories") &&
        !e.target.closest("#btnOpenCategories")
      ) {
        closeCat();
      }
    });
  }

  /* =========================
     Sort Sheet
  ========================= */
  if (btnOpenSort && sheetSort && overlaySort && btnCloseSort) {
    const openSort = () => {
      sheetSort.hidden = false;
      overlaySort.hidden = false;

      requestAnimationFrame(() => {
        sheetSort.classList.add("is-open");
        overlaySort.classList.add("is-open");
      });

      btnOpenSort.setAttribute("aria-expanded", "true");
      lockBackground?.();
      armDocClickGuard?.(120);
    };

    const closeSort = () => {
      sheetSort.classList.remove("is-open");
      overlaySort.classList.remove("is-open");
      btnOpenSort.setAttribute("aria-expanded", "false");

      const done = () => {
        sheetSort.hidden = true;
        overlaySort.hidden = true;
        sheetSort.removeEventListener("transitionend", done);
      };

      sheetSort.addEventListener("transitionend", done);
      setTimeout(done, 320);
      unlockBackground?.();
    };

    btnOpenSort.addEventListener("click", (e) => {
      e.preventDefault();
      sheetSort.hidden ? openSort() : closeSort();
    });

    btnCloseSort.addEventListener("click", (e) => {
      e.preventDefault();
      closeSort();
    });

    overlaySort.addEventListener("click", (e) => {
      if (e.target === overlaySort) closeSort();
    });

    sheetSort.addEventListener("click", (e) => {
      const item = e.target.closest(".sortSheet__item");
      if (!item) return;

      sheetSort
        .querySelectorAll(".sortSheet__item")
        .forEach((btn) => btn.setAttribute("aria-pressed", "false"));

      item.setAttribute("aria-pressed", "true");

      if (sortLabel) {
        sortLabel.textContent = item.textContent.trim();
      }

      const sortKey = item.dataset.sort;
      if (typeof window.applySort === "function") {
        window.applySort(sortKey);
      }

      closeSort();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !sheetSort.hidden) closeSort();
    });

    document.addEventListener("click", (e) => {
      if (sheetSort.hidden) return;
      if (shouldIgnoreDocClick?.()) return;

      if (
        !e.target.closest("#sheetSort") &&
        !e.target.closest("#btnOpenSort")
      ) {
        closeSort();
      }
    });
  }
})();
