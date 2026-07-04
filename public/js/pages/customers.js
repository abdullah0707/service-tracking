// ============================================================
// public/js/pages/customers.js — Customer Management (Phase 3)
// ============================================================

const customersPage = {

  // ── State ────────────────────────────────────────────────
  customers   : [],
  filtered    : [],
  sortKey     : 'name',       // 'name' | 'rating' | 'orders'
  sortDir     : 'asc',
  searchQuery : '',

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  async render() {
    const t = (k) => window.i18n.t(k);
    const lang = window.i18n.current;

    document.getElementById('page-content').innerHTML = `

      <div class="page-header">
        <h1>${t('customers')}</h1>
        <div style="display:flex;gap:8px">
          <a href="/api/export/customers.csv" class="btn btn-ghost btn-sm" download>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </a>
          <button class="btn btn-primary" onclick="customersPage.openAddModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            ${t('addCustomer')}
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar" id="cust-stats-bar">
        <div class="sbar-item"><span class="sbar-num" id="sb-total">—</span><span class="sbar-lbl">${lang==='ar'?'إجمالي العملاء':'Total Customers'}</span></div>
        <div class="sbar-item"><span class="sbar-num" id="sb-active">—</span><span class="sbar-lbl">${lang==='ar'?'لديهم أوردرات':'With Orders'}</span></div>
        <div class="sbar-item warn"><span class="sbar-num" id="sb-low">—</span><span class="sbar-lbl">${lang==='ar'?'تقييم منخفض':'Low Rating'}</span></div>
        <div class="sbar-item"><span class="sbar-num" id="sb-spend">—</span><span class="sbar-lbl">${lang==='ar'?'إجمالي الإنفاق':'Total Spending'}</span></div>
      </div>

      <!-- Toolbar -->
      <div class="p3-toolbar">
        <div class="search-bar p3-search">
          <svg class="search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="search-input" id="customer-search"
                 placeholder="${t('searchPlaceholder')}"
                 oninput="customersPage.onSearch(this.value)">
        </div>
        <div class="sort-row">
          <label class="sort-label">${lang==='ar'?'ترتيب:':'Sort:'}</label>
          <select class="sort-select" onchange="customersPage.onSort(this.value)">
            <option value="name"   ${this.sortKey==='name'   ?'selected':''}>${lang==='ar'?'الاسم':'Name'}</option>
            <option value="rating" ${this.sortKey==='rating' ?'selected':''}>${lang==='ar'?'التقييم':'Rating'}</option>
            <option value="orders" ${this.sortKey==='orders' ?'selected':''}>${lang==='ar'?'عدد الأوردرات':'Orders'}</option>
          </select>
          <button class="sort-dir-btn" onclick="customersPage.toggleSortDir()" title="${lang==='ar'?'عكس الترتيب':'Reverse'}">
            ${this.sortDir==='asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <!-- Cards grid -->
      <div id="customers-grid" class="entity-grid">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>

      <!-- ════ FORM MODAL ══════════════════════════════════ -->
      <div class="modal-overlay" id="modal-customer-form">
        <div class="modal">
          <div class="modal-header">
            <h2 id="cust-modal-title">${t('addCustomer')}</h2>
            <button class="modal-close" onclick="utils.hideModal('modal-customer-form')">✕</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="cust-form-id">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>${t('customerName')} *</label>
                <input type="text" id="cust-name" class="form-control" placeholder="${t('customerName')}">
              </div>
              <div class="form-group">
                <label>${t('phone')} *</label>
                <input type="tel" id="cust-phone" class="form-control" dir="ltr"
                       placeholder="05XXXXXXXX" maxlength="11"
                       oninput="this.value=this.value.replace(/\D/g,'')">
              </div>
              <div class="form-group">
                <label>${t('area')}</label>
                <input type="text" id="cust-area" class="form-control" placeholder="${t('area')}">
              </div>
              <div class="form-group full-width">
                <label>${t('address')}</label>
                <input type="text" id="cust-address" class="form-control" placeholder="${t('detailedAddress')}">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-customer-form')">${t('cancel')}</button>
            <button class="btn btn-primary" id="cust-save-btn" onclick="customersPage.saveCustomer()">${t('save')}</button>
          </div>
        </div>
      </div>

      <!-- ════ HISTORY MODAL ══════════════════════════════ -->
      <div class="modal-overlay" id="modal-customer-history">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h2 id="hist-cust-name">—</h2>
              <p class="modal-subtitle" id="hist-cust-phone"></p>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-sm btn-ghost" id="hist-edit-btn">${t('edit')}</button>
              <button class="modal-close" onclick="utils.hideModal('modal-customer-history')">✕</button>
            </div>
          </div>
          <div class="modal-body" id="customer-history-body">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- ════ CONFIRM DELETE MODAL ═══════════════════════ -->
      <div class="modal-overlay" id="modal-confirm-delete-c">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>${lang==='ar'?'تأكيد الحذف':'Confirm Delete'}</h2>
            <button class="modal-close" onclick="utils.hideModal('modal-confirm-delete-c')">✕</button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon">🗑️</div>
            <p class="confirm-msg" id="confirm-delete-msg-c"></p>
            <p class="confirm-sub">${lang==='ar'?'هذا الإجراء لا يمكن التراجع عنه.':'This action cannot be undone.'}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-confirm-delete-c')">${t('cancel')}</button>
            <button class="btn btn-danger" id="confirm-delete-btn-c">${t('delete')}</button>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  },

  // ════════════════════════════════════════════════════════
  // DATA
  // ════════════════════════════════════════════════════════
  async loadData() {
    try {
      this.customers = await api.customers.list();
      this.applyFilters();
      this.updateStatsBar();
    } catch { utils.toast(window.i18n.t('error'), 'error'); }
  },

  updateStatsBar() {
    const all      = this.customers;
    const withOrds = all.filter(c => (c.total_orders || 0) > 0);
    const lowRat   = all.filter(c => utils.isLowRating(c.average_rating));

    // Total spending across all customers
    const spend = all.reduce((s, c) => {
      const orders = c.orders_history || [];
      return s + orders.reduce((os, o) => os + (o.cost || 0), 0);
    }, 0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('sb-total',  all.length);
    set('sb-active', withOrds.length);
    set('sb-low',    lowRat.length);
    set('sb-spend',  utils.currency(spend));

    const lowEl = document.getElementById('sb-low');
    if (lowEl) lowEl.style.color = lowRat.length > 0 ? 'var(--pending)' : 'var(--completed)';
  },

  // ════════════════════════════════════════════════════════
  // FILTERING & SORTING
  // ════════════════════════════════════════════════════════
  onSearch(val) {
    this.searchQuery = val.trim().toLowerCase();
    this.applyFilters();
  },

  onSort(key) {
    this.sortKey = key;
    this.applyFilters();
  },

  toggleSortDir() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    const btn = document.querySelector('.sort-dir-btn');
    if (btn) btn.textContent = this.sortDir === 'asc' ? '↑' : '↓';
    this.applyFilters();
  },

  applyFilters() {
    let result = [...this.customers];

    // Search
    if (this.searchQuery) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(this.searchQuery) ||
        (c.phone || '').includes(this.searchQuery) ||
        (c.area  || '').toLowerCase().includes(this.searchQuery)
      );
    }

    // Sort
    result.sort((a, b) => {
      let va, vb;
      if (this.sortKey === 'name') {
        va = a.name || ''; vb = b.name || '';
        return this.sortDir === 'asc' ? va.localeCompare(vb, 'ar') : vb.localeCompare(va, 'ar');
      }
      if (this.sortKey === 'rating') {
        va = a.average_rating ?? -1; vb = b.average_rating ?? -1;
      }
      if (this.sortKey === 'orders') {
        va = a.total_orders || 0; vb = b.total_orders || 0;
      }
      return this.sortDir === 'asc' ? va - vb : vb - va;
    });

    this.filtered = result;
    this.renderGrid();
  },

  // ════════════════════════════════════════════════════════
  // RENDER GRID
  // ════════════════════════════════════════════════════════
  renderGrid() {
    const t   = (k) => window.i18n.t(k);
    const el  = document.getElementById('customers-grid');
    const lang = window.i18n.current;

    if (!this.filtered.length) {
      el.innerHTML = `
        <div class="empty-card" style="grid-column:1/-1">
          <div class="empty-icon">👤</div>
          <p>${this.searchQuery
              ? (lang==='ar'?'لا توجد نتائج للبحث':'No search results')
              : t('noOrdersYet')}</p>
          ${!this.searchQuery ? `<button class="btn btn-primary" onclick="customersPage.openAddModal()">+ ${t('addCustomer')}</button>` : ''}
        </div>`;
      return;
    }

    el.innerHTML = this.filtered.map(c => {
      const isLow      = utils.isLowRating(c.average_rating);
      const lastOrder  = (c.orders_history || []).sort((a,b) => b.date?.localeCompare(a.date || ''))[0];
      const totalSpend = (c.orders_history || []).reduce((s, o) => s + (o.cost || 0), 0);

      return `
      <div class="entity-card ${isLow ? 'card-warning' : ''}" id="ccard-${c.id}">

        <!-- Header -->
        <div class="entity-card-header">
          <div class="entity-avatar cust-avatar" style="${this._avatarColor(c.name)}">
            ${c.name.charAt(0)}
          </div>
          <div class="entity-info">
            <h3>${utils.esc(c.name)}</h3>
            <a href="tel:${c.phone}" class="phone-link dir-ltr" onclick="event.stopPropagation()">
              ${utils.esc(c.phone)}
            </a>
          </div>
          ${isLow ? `<span class="warn-badge" title="${t('alertLowRatingCustomer', {rating: c.average_rating})}">⚠️</span>` : ''}
        </div>

        <!-- Meta -->
        <div class="entity-meta">
          <div class="meta-item">
            <span class="meta-icon">📍</span>
            <span>${utils.esc(c.area || '—')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">📋</span>
            <span>${c.total_orders || 0} ${t('totalOrders')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⭐</span>
            <span>${c.average_rating !== null && c.average_rating !== undefined
                     ? utils.stars(c.average_rating) : `<span class="text-muted">${t('noRating')}</span>`}</span>
          </div>
          ${totalSpend > 0 ? `
          <div class="meta-item">
            <span class="meta-icon">💰</span>
            <span class="amount-sm">${utils.currency(totalSpend)}</span>
          </div>` : ''}
          ${lastOrder ? `
          <div class="meta-item">
            <span class="meta-icon">🕐</span>
            <span class="text-muted-sm">${lang==='ar'?'آخر أوردر:':'Last:'} ${utils.formatDate(lastOrder.date)}</span>
          </div>` : ''}
        </div>

        <!-- Actions -->
        <div class="entity-actions">
          <button class="btn btn-sm btn-outline" onclick="customersPage.openHistory('${c.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${t('customerHistory')}
          </button>
          <button class="btn btn-sm btn-ghost" onclick="customersPage.openEditModal('${c.id}')">
            ${t('edit')}
          </button>
          <button class="btn btn-sm btn-danger-ghost" onclick="customersPage.confirmDelete('${c.id}', '${utils.esc(c.name)}')">
            ${t('delete')}
          </button>
        </div>

      </div>`;
    }).join('');
  },

  // Deterministic avatar color per first char
  _avatarColor(name) {
    const colors = [
      'background:#dbeafe;color:#1d4ed8',
      'background:#dcfce7;color:#15803d',
      'background:#fce7f3;color:#be185d',
      'background:#fef3c7;color:#b45309',
      'background:#ede9fe;color:#6d28d9',
      'background:#ffedd5;color:#c2410c',
    ];
    const idx = (name.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  },

  // ════════════════════════════════════════════════════════
  // ADD / EDIT MODAL
  // ════════════════════════════════════════════════════════
  openAddModal() {
    const t = (k) => window.i18n.t(k);
    document.getElementById('cust-modal-title').textContent = t('addCustomer');
    ['cust-form-id','cust-name','cust-phone','cust-area','cust-address']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.classList.remove('field-error'); }
      });
    utils.showModal('modal-customer-form');
    setTimeout(() => document.getElementById('cust-name')?.focus(), 200);
  },

  openEditModal(id) {
    const t = (k) => window.i18n.t(k);
    const c = this.customers.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cust-modal-title').textContent = t('editCustomer');
    document.getElementById('cust-form-id').value  = c.id;
    document.getElementById('cust-name').value     = c.name;
    document.getElementById('cust-phone').value    = c.phone;
    document.getElementById('cust-area').value     = c.area    || '';
    document.getElementById('cust-address').value  = c.address || '';
    ['cust-name','cust-phone','cust-area','cust-address']
      .forEach(id => document.getElementById(id)?.classList.remove('field-error'));
    utils.hideModal('modal-customer-history');
    utils.showModal('modal-customer-form');
  },

  _validateCustForm() {
    let ok = true;
    [{ id:'cust-name', req:true }, { id:'cust-phone', req:true }].forEach(({id, req}) => {
      const el = document.getElementById(id);
      if (!el) return;
      const empty = req && !el.value.trim();
      el.classList.toggle('field-error', empty);
      if (empty) ok = false;
    });
    return ok;
  },

  async saveCustomer() {
    if (!this._validateCustForm()) {
      utils.toast(window.i18n.current === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    const t   = (k) => window.i18n.t(k);
    const id  = document.getElementById('cust-form-id').value;
    const btn = document.getElementById('cust-save-btn');
    const data = {
      name   : document.getElementById('cust-name').value.trim(),
      phone  : document.getElementById('cust-phone').value.trim(),
      area   : document.getElementById('cust-area').value.trim(),
      address: document.getElementById('cust-address').value.trim(),
    };
    btn.disabled = true;
    try {
      if (id) await api.customers.update(id, data);
      else     await api.customers.create(data);
      utils.toast(t('success'), 'success');
      utils.hideModal('modal-customer-form');
      await this.loadData();
    } catch {
      utils.toast(t('error'), 'error');
    } finally {
      btn.disabled = false;
    }
  },

  // ════════════════════════════════════════════════════════
  // CONFIRM DELETE (custom modal, no browser confirm)
  // ════════════════════════════════════════════════════════
  confirmDelete(id, name) {
    const lang = window.i18n.current;
    document.getElementById('confirm-delete-msg-c').textContent =
      lang === 'ar' ? `هل تريد حذف العميل "${name}"؟` : `Delete customer "${name}"?`;

    const btn = document.getElementById('confirm-delete-btn-c');
    // Remove previous listener and attach fresh one
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => this.deleteCustomer(id));

    utils.showModal('modal-confirm-delete-c');
  },

  async deleteCustomer(id) {
    const t = (k) => window.i18n.t(k);
    try {
      await api.customers.remove(id);
      utils.toast(t('success'), 'success');
      utils.hideModal('modal-confirm-delete-c');
      await this.loadData();
    } catch { utils.toast(t('error'), 'error'); }
  },

  // ════════════════════════════════════════════════════════
  // HISTORY MODAL
  // ════════════════════════════════════════════════════════
  async openHistory(id) {
    utils.showModal('modal-customer-history');
    document.getElementById('customer-history-body').innerHTML =
      `<div class="loading-spinner"><div class="spinner"></div></div>`;
    document.getElementById('hist-cust-name').textContent = '…';
    document.getElementById('hist-cust-phone').textContent = '';

    try {
      const c = await api.customers.get(id);

      document.getElementById('hist-cust-name').textContent  = c.name;
      document.getElementById('hist-cust-phone').textContent = c.phone;
      document.getElementById('hist-edit-btn').onclick = () => this.openEditModal(id);

      document.getElementById('customer-history-body').innerHTML =
        this._buildHistoryHTML(c);
    } catch {
      document.getElementById('customer-history-body').innerHTML =
        `<div class="empty-card"><p>${window.i18n.t('error')}</p></div>`;
    }
  },

  _buildHistoryHTML(c) {
    const t       = (k) => window.i18n.t(k);
    const lang    = window.i18n.current;
    const orders  = (c.orders_history || []).slice().sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const completed = orders.filter(o => o.status === 'completed');
    const totalSpend = completed.reduce((s, o) => s + (o.cost || 0), 0);

    // Area breakdown
    const areaCounts = {};
    orders.forEach(o => { if (o.area) areaCounts[o.area] = (areaCounts[o.area]||0)+1; });
    const topAreas = Object.entries(areaCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);

    // Feedback received from workers (workers rate customers)
    const feedbacks = orders.filter(o => o.worker_feedback?.rating);
    const avgRating = feedbacks.length
      ? (feedbacks.reduce((s,o)=>s+o.worker_feedback.rating,0)/feedbacks.length).toFixed(1)
      : null;

    // ── Summary cards ───────────────────────────────────
    const summaryHTML = `
      <div class="hist-summary-grid">
        <div class="hist-stat">
          <span class="hist-stat-num">${orders.length}</span>
          <span class="hist-stat-lbl">${t('totalOrders')}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num">${completed.length}</span>
          <span class="hist-stat-lbl">${lang==='ar'?'مكتملة':'Completed'}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num amount-sm">${utils.currency(totalSpend)}</span>
          <span class="hist-stat-lbl">${lang==='ar'?'إجمالي الإنفاق':'Total Spent'}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num">${avgRating ? utils.stars(Number(avgRating)) : '—'}</span>
          <span class="hist-stat-lbl">${t('avgRating')}</span>
        </div>
      </div>`;

    // ── Area breakdown ──────────────────────────────────
    const areasHTML = topAreas.length ? `
      <div class="hist-section">
        <h4 class="hist-section-title">
          📍 ${lang==='ar'?'المناطق المخدومة':'Service Areas'}
        </h4>
        <div class="area-bars">
          ${topAreas.map(([area, count]) => `
            <div class="area-bar-row">
              <span class="area-bar-lbl">${utils.esc(area)}</span>
              <div class="area-bar-track">
                <div class="area-bar-fill" style="width:${Math.round(count/orders.length*100)}%"></div>
              </div>
              <span class="area-bar-val">${count}</span>
            </div>`).join('')}
        </div>
      </div>` : '';

    // ── Orders timeline ─────────────────────────────────
    if (!orders.length) {
      return summaryHTML + `<div class="empty-card" style="margin-top:16px"><p>${t('noOrdersYet')}</p></div>`;
    }

    const tableHTML = `
      <div class="hist-section">
        <h4 class="hist-section-title">
          📋 ${lang==='ar'?'سجل الأوردرات':'Order History'}
        </h4>
        <div class="orders-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('date')}</th>
                <th>${t('area')}</th>
                <th>${t('serviceType')}</th>
                <th>${t('cost')}</th>
                <th>${t('status')}</th>
                <th>${lang==='ar'?'تقييم العامل له':'Worker Rating'}</th>
                <th>${t('notesLabel')}</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr class="tr-${o.status}">
                  <td>${utils.formatDate(o.date)}</td>
                  <td>${utils.esc(o.area)}</td>
                  <td>${utils.statusBadge(o.service_type)}</td>
                  <td class="amount">${utils.currency(o.cost)}</td>
                  <td>${utils.statusBadge(o.status)}</td>
                  <td>${o.worker_feedback?.rating ? utils.stars(o.worker_feedback.rating) : '<span class="text-muted">—</span>'}</td>
                  <td class="notes-cell">${utils.esc(o.worker_feedback?.notes || '—')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    return summaryHTML + areasHTML + tableHTML;
  },
};
