// ============================================================
// public/js/api.js — Typed API client (fetch wrappers)
// ============================================================

const API_BASE = '';  // same-origin

// ── Auth helpers ─────────────────────────────────────────────
const auth = {
  getToken()  { return localStorage.getItem('st_token') || ''; },
  getUser()   { try { return JSON.parse(localStorage.getItem('st_user') || 'null'); } catch { return null; } },
  isLoggedIn(){ return !!this.getToken(); },
  logout()    {
    const token = this.getToken();
    if (token) {
      fetch('/api/auth/logout', {
        method:'POST',
        headers:{ 'Authorization': `Bearer ${token}` }
      }).catch(()=>{});
    }
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_user');
    window.location.href = '/login.html';
  },
};

const api = {
  // ── Core fetch wrapper with auth ────────────────────────
  async _fetch(method, path, body) {
    const token = auth.getToken();
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Token expired or invalid → go to login
    if (res.status === 401) {
      localStorage.removeItem('st_token');
      localStorage.removeItem('st_user');
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
    return res.json();
  },

  async get(path)         { return this._fetch('GET',    path); },
  async post(path, body)  { return this._fetch('POST',   path, body); },
  async put(path, body)   { return this._fetch('PUT',    path, body); },
  async del(path)         { return this._fetch('DELETE', path); },

  // ── Domain-specific calls ──────────────────────────────
  customers : {
    list   : ()   => api.get('/api/customers'),
    get    : (id) => api.get(`/api/customers/${id}`),
    create : (d)  => api.post('/api/customers', d),
    update : (id, d) => api.put(`/api/customers/${id}`, d),
    remove : (id) => api.del(`/api/customers/${id}`),
  },
  workers: {
    list   : (q = {}) => api.get(`/api/workers?${new URLSearchParams(q)}`),
    get    : (id) => api.get(`/api/workers/${id}`),
    create : (d)  => api.post('/api/workers', d),
    update : (id, d) => api.put(`/api/workers/${id}`, d),
    remove : (id) => api.del(`/api/workers/${id}`),
  },
  orders: {
    list   : (q = {}) => api.get(`/api/orders?${new URLSearchParams(q)}`),
    today  : ()   => api.get('/api/orders?today=1'),
    get    : (id) => api.get(`/api/orders/${id}`),
    create : (d)  => api.post('/api/orders', d),
    update : (id, d) => api.put(`/api/orders/${id}`, d),
    remove : (id) => api.del(`/api/orders/${id}`),
  },
  analytics: {
    get: () => api.get('/api/analytics'),
  },
  authApi: {
    login        : (u,p) => api.post('/api/auth/login', { username:u, password:p }),
    me           : ()    => api.get('/api/auth/me'),
    logout       : ()    => api.post('/api/auth/logout', {}),
    changePassword: (cur,n) => api.put('/api/auth/change-password', { current_password:cur, new_password:n }),
    listUsers    : ()    => api.get('/api/auth/users'),
    createUser   : (d)   => api.post('/api/auth/users', d),
    deleteUser   : (id)  => api.del(`/api/auth/users/${id}`),
  },
  settings: {
    get   : ()    => api.get('/api/settings'),
    update: (data) => api.put('/api/settings', data),
  },
  timeAlerts: {
    get: () => api.get('/api/orders/time-alerts'),
  },
  feedback: {
    getOrder    : (id)       => api.get(`/api/feedback/order/${id}`),
    customer    : (id, data) => api.post(`/api/feedback/customer/${id}`, data),
    worker      : (id, data) => api.post(`/api/feedback/worker/${id}`, data),
  },
};

// ============================================================
// public/js/utils.js — Shared utilities
// ============================================================

const utils = {
  // ── Date ──────────────────────────────────────────────────
  today() {
    return new Date().toISOString().split('T')[0];
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    const lang = window.i18n?.current || 'ar';
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  },

  // ── Stars ─────────────────────────────────────────────────
  stars(rating, max = 5) {
    if (!rating && rating !== 0) return '<span class="no-rating">—</span>';
    const full  = Math.round(rating);
    let html = '';
    for (let i = 1; i <= max; i++) {
      html += `<span class="star ${i <= full ? 'filled' : 'empty'}">★</span>`;
    }
    return `<span class="stars-row">${html} <span class="rating-num">${rating}</span></span>`;
  },

  // ── Status badge ──────────────────────────────────────────
  statusBadge(status) {
    const map = {
      pending   : 'badge-pending',
      dispatched: 'badge-dispatched',
      completed : 'badge-completed',
      cancelled : 'badge-cancelled',
      available : 'badge-available',
      busy      : 'badge-busy',
      off       : 'badge-off',
    };
    const t = window.i18n?.t(status) || status;
    return `<span class="badge ${map[status] || ''}">${t}</span>`;
  },

  // ── WhatsApp URL ──────────────────────────────────────────
  whatsappUrl(phone, message) {
    const cleaned = phone.replace(/\D/g, '');
    const intl    = cleaned.startsWith('0') ? '2' + cleaned.slice(1) : cleaned;
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  },

  // ── Feedback URLs ─────────────────────────────────────────
  feedbackUrl(orderId, type) {
    // type: 'customer' | 'worker'
    return `${window.location.origin}/feedback.html?order=${orderId}&type=${type}`;
  },

  // ── Toast notifications ───────────────────────────────────
  toast(msg, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // ── Modal helpers ─────────────────────────────────────────
  showModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('open'); document.body.classList.add('modal-open'); }
  },
  hideModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('open'); document.body.classList.remove('modal-open'); }
  },

  // ── Escape HTML ───────────────────────────────────────────
  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // ── Low rating check ──────────────────────────────────────
  isLowRating(rating) {
    return rating !== null && rating !== undefined && Number(rating) < 3;
  },

  // ── Currency ──────────────────────────────────────────────
  currency(amount) {
    const lang = window.i18n?.current || 'ar';
    return Number(amount || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') + ' ' + (window.i18n?.t('currency') || 'EGP');
  },

  // ── Time status badge ─────────────────────────────────────
  timeStatusBadge(timeStatus, scheduledTime) {
    if (!timeStatus || timeStatus === 'none' || !scheduledTime) return '';
    const lang = window.i18n?.current || 'ar';
    const labels = {
      ar: { late:'⏰ متأخر', due_now:'🔔 حان وقته', upcoming:'📅 قادم' },
      en: { late:'⏰ Late',  due_now:'🔔 Due Now',   upcoming:'📅 Upcoming' },
    };
    const cls = { late:'time-late', due_now:'time-due', upcoming:'time-upcoming' };
    const label   = (labels[lang] || labels.ar)[timeStatus] || timeStatus;
    const timeStr = this.formatTime(scheduledTime);
    return `<span class="time-badge ${cls[timeStatus] || ''}">${label}&nbsp;${timeStr}</span>`;
  },

  // ── Format time "HH:MM" → localized 12h/24h ──────────────
  formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      const lang = window.i18n?.current || 'ar';
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return timeStr; }
  },
};
