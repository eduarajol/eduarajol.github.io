// Phone-only touches: swipe between ally cards, and keep the picked tab and its content in view.
(function () {
  const isPhone = () => document.documentElement.clientWidth <= 760;

  // Swipe left/right on the ally cards presses the carousel's own previous/next buttons.
  let sx = 0, sy = 0, tracking = false;
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.m-ally-view')) return;
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    const btn = document.querySelector(dx < 0 ? '[aria-label="Next recommendation"]' : '[aria-label="Previous recommendation"]');
    if (btn) btn.click();
  }, { passive: true });

  // After picking an ability tab: centre the tab in its row and bring the top of the panel into view.
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.m-tab');
    if (!tab || !isPhone()) return;
    requestAnimationFrame(() => {
      const row = tab.parentElement;
      row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
      const panel = document.querySelector('.m-panel');
      if (!panel) return;
      const top = panel.getBoundingClientRect().top + window.scrollY - 60 - row.offsetHeight - 8;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
