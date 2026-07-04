// ============================================================
// public/js/app.js — SPA Router, Keyboard Shortcuts, Transitions
// Phase 4: Auto-refresh cleanup, keyboard nav, global error handling
// ============================================================

const app = {
  currentPage: 'dashboard',

  pages: {
    dashboard : dashboardPage,
    callcenter: callcenterPage,
    customers : customersPage,
    workers   : workersPage,
    settings  : settingsPage,
  },

  async navigate(page) {
    if (!this.pages[page]) return;

    // Stop dashboard auto-refresh when leaving
    if (this.currentPage === 'dashboard' && page !== 'dashboard') {
      dashboardPage._stopAutoRefresh?.();
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    this.currentPage = page;
    history.pushState({ page }, '', `#${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page transition: fade out → render → fade in
    const content = document.getElementById('page-content');
    content.classList.add('page-exit');

    await new Promise(r => setTimeout(r, 120));

    content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    content.classList.remove('page-exit');
    content.classList.add('page-enter');

    await this.pages[page].render();
    window.i18n.applyAll();

    requestAnimationFrame(() => {
      content.classList.remove('page-enter');
    });
  },

  // ── Theme ────────────────────────────────────────────────
  initTheme() {
    const saved = localStorage.getItem('st_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this._updateThemeBtn(saved);
  },

  toggleTheme() {
    const cur  = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('st_theme', next);
    this._updateThemeBtn(next);
  },

  _updateThemeBtn(theme) {
    const isDark = theme === 'dark';
    const moonSVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const sunSVG  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const icon  = isDark ? sunSVG  : moonSVG;
    const label = isDark
      ? (window.i18n?.t('lightMode') || 'الوضع الفاتح')
      : (window.i18n?.t('darkMode')  || 'الوضع الداكن');

    document.querySelectorAll('#theme-toggle, #theme-toggle-mobile').forEach(btn => {
      if (!btn) return;
      btn.innerHTML = `${icon}<span>${label}</span>`;
    });
  },

  // ── Language ─────────────────────────────────────────────
  initLang() {
    window.i18n.init();
    this._updateLangBtn();
  },

  toggleLang() {
    window.i18n.toggle();
    this._updateLangBtn();
    this.navigate(this.currentPage);
  },

  _updateLangBtn() {
    const label = window.i18n.t('lang');
    document.querySelectorAll('#lang-toggle').forEach(btn => {
      if (btn) btn.querySelector('span').textContent = label;
    });
  },

  // ── Keyboard shortcuts ───────────────────────────────────
  _initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing inside an input / textarea
      const tag = document.activeElement?.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

      // Skip if a modal is open
      if (document.querySelector('.modal-overlay.open')) return;

      switch (e.key) {
        case '1': this.navigate('dashboard');  break;
        case '2': this.navigate('callcenter'); break;
        case '3': this.navigate('customers');  break;
        case '4': this.navigate('workers');    break;
        case '5': this.navigate('settings');   break;
        case 'n': case 'N':
          if (this.currentPage === 'callcenter') callcenterPage.openNewOrderModal();
          break;
        case 'r': case 'R':
          if (this.currentPage === 'dashboard') dashboardPage.refresh();
          break;
      }
    });
  },

  // ── Global error handler ─────────────────────────────────
  _initErrorHandler() {
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      // Only show toast if it's a network error
      if (e.reason?.message?.includes('fetch') || e.reason instanceof TypeError) {
        utils.toast(
          window.i18n?.current === 'ar'
            ? '⚠️ تعذّر الاتصال بالسيرفر'
            : '⚠️ Could not reach the server',
          'error', 4000
        );
      }
      e.preventDefault();
    });
  },

  // ── Init ─────────────────────────────────────────────────
  async init() {
    this.initTheme();
    this.initLang();
    this._initKeyboard();
    this._initErrorHandler();

    // Hash routing
    const hash      = window.location.hash.replace('#', '');
    const startPage = (hash && this.pages[hash]) ? hash : 'dashboard';

    window.onpopstate = (e) => {
      if (e.state?.page) this.navigate(e.state.page);
    };

    await this.navigate(startPage);
  },
};

// ── Modal: close on overlay click ────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
});

// ── Modal: close on Escape ────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal-overlay.open');
    if (open) {
      open.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
  }
});

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());
