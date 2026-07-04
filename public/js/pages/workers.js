// ============================================================
// public/js/pages/workers.js — Worker Management (Phase 3)
// ============================================================

const workersPage = {

  // ── State ────────────────────────────────────────────────
  workers          : [],
  filtered         : [],
  statusFilter     : '',   // '' | 'available' | 'busy' | 'off'
  searchQuery      : '',
  sortKey          : 'name',
  sortDir          : 'asc',

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  async render() {
    const t    = (k) => window.i18n.t(k);
    const lang = window.i18n.current;

    document.getElementById('page-content').innerHTML = `

      <div class="page-header">
        <h1>${t('workers')}</h1>
        <div style="display:flex;gap:8px">
          <a href="/api/export/workers.csv" class="btn btn-ghost btn-sm" download>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </a>
          <button class="btn btn-primary" onclick="workersPage.openAddModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            ${t('addWorker')}
          </button>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar" id="wrk-stats-bar">
        <div class="sbar-item available-bar"><span class="sbar-num" id="sb-w-avail">—</span><span class="sbar-lbl">${t('available')}</span></div>
        <div class="sbar-item busy-bar">     <span class="sbar-num" id="sb-w-busy">—</span> <span class="sbar-lbl">${t('busy')}</span></div>
        <div class="sbar-item off-bar">      <span class="sbar-num" id="sb-w-off">—</span>  <span class="sbar-lbl">${t('off')}</span></div>
        <div class="sbar-item">              <span class="sbar-num" id="sb-w-total">—</span><span class="sbar-lbl">${lang==='ar'?'إجمالي':'Total'}</span></div>
      </div>

      <!-- Toolbar -->
      <div class="p3-toolbar">
        <div class="search-bar p3-search">
          <svg class="search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="search-input" id="worker-search"
                 placeholder="${t('searchPlaceholder')}"
                 oninput="workersPage.onSearch(this.value)">
        </div>
        <div class="sort-row">
          <label class="sort-label">${lang==='ar'?'ترتيب:':'Sort:'}</label>
          <select class="sort-select" onchange="workersPage.onSort(this.value)">
            <option value="name"   >${lang==='ar'?'الاسم':'Name'}</option>
            <option value="rating" >${lang==='ar'?'التقييم':'Rating'}</option>
            <option value="orders" >${lang==='ar'?'عدد الأوردرات':'Orders'}</option>
            <option value="status" >${lang==='ar'?'الحالة':'Status'}</option>
          </select>
          <button class="sort-dir-btn" onclick="workersPage.toggleSortDir()">↑</button>
        </div>
      </div>

      <!-- Status filter tabs with counts -->
      <div class="status-tabs" id="wrk-status-tabs">
        <!-- filled after data loads -->
      </div>

      <!-- Worker cards -->
      <div id="workers-grid-main" class="entity-grid">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>

      <!-- ════ FORM MODAL ══════════════════════════════════ -->
      <div class="modal-overlay" id="modal-worker-form">
        <div class="modal">
          <div class="modal-header">
            <h2 id="worker-modal-title">${t('addWorker')}</h2>
            <button class="modal-close" onclick="utils.hideModal('modal-worker-form')">✕</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="worker-form-id">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>${lang==='ar'?'اسم العامل':'Worker Name'} *</label>
                <input type="text" id="worker-name" class="form-control" placeholder="${lang==='ar'?'الاسم الكامل':'Full name'}">
              </div>
              <div class="form-group">
                <label>${t('phone')} *</label>
                <input type="tel" id="worker-phone" class="form-control" dir="ltr"
                       placeholder="05XXXXXXXX" maxlength="11"
                       oninput="this.value=this.value.replace(/\D/g,'')">
              </div>
              <div class="form-group">
                <label>${t('nationalId')}</label>
                <input type="text" id="worker-national-id" class="form-control"
                       dir="ltr" maxlength="14" placeholder="14 ${lang==='ar'?'رقم':'digits'}"
                       oninput="this.value=this.value.replace(/\D/g,'')">
              </div>
              <div class="form-group">
                <label>${t('area')}</label>
                <input type="text" id="worker-area" class="form-control" placeholder="${t('area')}">
              </div>
              <div class="form-group">
                <label>${t('address')}</label>
                <input type="text" id="worker-address" class="form-control" placeholder="${t('detailedAddress')}">
              </div>
              <div class="form-group">
                <label>${t('status')}</label>
                <select id="worker-status" class="form-control">
                  <option value="available">${t('available')}</option>
                  <option value="busy">${t('busy')}</option>
                  <option value="off">${t('off')}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-worker-form')">${t('cancel')}</button>
            <button class="btn btn-primary" id="wrk-save-btn" onclick="workersPage.saveWorker()">${t('save')}</button>
          </div>
        </div>
      </div>

      <!-- ════ HISTORY MODAL ══════════════════════════════ -->
      <div class="modal-overlay" id="modal-worker-history">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h2 id="hist-wrk-name">—</h2>
              <p class="modal-subtitle" id="hist-wrk-meta"></p>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-sm btn-ghost" id="hist-wrk-edit-btn">${t('edit')}</button>
              <button class="modal-close" onclick="utils.hideModal('modal-worker-history')">✕</button>
            </div>
          </div>
          <div class="modal-body" id="worker-history-body">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- ════ CONFIRM DELETE MODAL ═══════════════════════ -->
      <div class="modal-overlay" id="modal-confirm-delete-w">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>${lang==='ar'?'تأكيد الحذف':'Confirm Delete'}</h2>
            <button class="modal-close" onclick="utils.hideModal('modal-confirm-delete-w')">✕</button>
          </div>
          <div class="modal-body">
            <div class="confirm-icon">🗑️</div>
            <p class="confirm-msg" id="confirm-delete-msg-w"></p>
            <p class="confirm-sub">${lang==='ar'?'هذا الإجراء لا يمكن التراجع عنه.':'This action cannot be undone.'}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-confirm-delete-w')">${t('cancel')}</button>
            <button class="btn btn-danger" id="confirm-delete-btn-w">${t('delete')}</button>
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
      this.workers  = await api.workers.list();
      this.applyFilters();
      this.updateStatsBar();
      this.renderStatusTabs();
    } catch { utils.toast(window.i18n.t('error'), 'error'); }
  },

  updateStatsBar() {
    const w = this.workers;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sb-w-avail', w.filter(x => x.status==='available').length);
    set('sb-w-busy',  w.filter(x => x.status==='busy').length);
    set('sb-w-off',   w.filter(x => x.status==='off').length);
    set('sb-w-total', w.length);
  },

  renderStatusTabs() {
    const t    = (k) => window.i18n.t(k);
    const lang = window.i18n.current;
    const w    = this.workers;
    const tabs = [
      { key:'',          label: lang==='ar'?'الكل':'All',       cls:'' },
      { key:'available', label: t('available'),                  cls:'tab-completed' },
      { key:'busy',      label: t('busy'),                       cls:'tab-pending' },
      { key:'off',       label: t('off'),                        cls:'tab-cancelled' },
    ];
    const counts = {
      '': w.length,
      available: w.filter(x=>x.status==='available').length,
      busy:      w.filter(x=>x.status==='busy').length,
      off:       w.filter(x=>x.status==='off').length,
    };
    const el = document.getElementById('wrk-status-tabs');
    if (!el) return;
    el.innerHTML = tabs.map(tab => `
      <button class="stab ${tab.cls} ${this.statusFilter===tab.key?'active':''}"
              onclick="workersPage.setStatusFilter('${tab.key}', this)">
        ${tab.label}
        <span class="stab-count">${counts[tab.key]}</span>
      </button>`).join('');
  },

  // ════════════════════════════════════════════════════════
  // FILTERING & SORTING
  // ════════════════════════════════════════════════════════
  onSearch(val) {
    this.searchQuery = val.trim().toLowerCase();
    this.applyFilters();
  },

  setStatusFilter(status, btn) {
    this.statusFilter = status;
    document.querySelectorAll('#wrk-status-tabs .stab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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
    let result = [...this.workers];

    // Status filter
    if (this.statusFilter) {
      result = result.filter(w => w.status === this.statusFilter);
    }

    // Search (applied ON TOP of status filter)
    if (this.searchQuery) {
      result = result.filter(w =>
        w.name.toLowerCase().includes(this.searchQuery) ||
        (w.phone       || '').includes(this.searchQuery) ||
        (w.area        || '').toLowerCase().includes(this.searchQuery) ||
        (w.national_id || '').includes(this.searchQuery)
      );
    }

    // Sort
    const statusOrder = { available:0, busy:1, off:2 };
    result.sort((a, b) => {
      let va, vb;
      if (this.sortKey === 'name') {
        va = a.name||''; vb = b.name||'';
        return this.sortDir==='asc' ? va.localeCompare(vb,'ar') : vb.localeCompare(va,'ar');
      }
      if (this.sortKey === 'status') {
        va = statusOrder[a.status]??9; vb = statusOrder[b.status]??9;
      } else if (this.sortKey === 'rating') {
        va = a.average_rating??-1; vb = b.average_rating??-1;
      } else if (this.sortKey === 'orders') {
        va = a.total_orders||0; vb = b.total_orders||0;
      }
      return this.sortDir==='asc' ? va - vb : vb - va;
    });

    this.filtered = result;
    this.renderGrid();
  },

  // ════════════════════════════════════════════════════════
  // RENDER GRID
  // ════════════════════════════════════════════════════════
  renderGrid() {
    const t    = (k) => window.i18n.t(k);
    const lang = window.i18n.current;
    const el   = document.getElementById('workers-grid-main');

    if (!this.filtered.length) {
      el.innerHTML = `
        <div class="empty-card" style="grid-column:1/-1">
          <div class="empty-icon">👷</div>
          <p>${this.searchQuery || this.statusFilter
              ? (lang==='ar'?'لا توجد نتائج':'No results')
              : t('noOrdersYet')}</p>
          ${!this.searchQuery && !this.statusFilter
            ? `<button class="btn btn-primary" onclick="workersPage.openAddModal()">+ ${t('addWorker')}</button>`
            : ''}
        </div>`;
      return;
    }

    el.innerHTML = this.filtered.map(w => {
      const isLow     = utils.isLowRating(w.average_rating);
      const orders    = w.orders_history || [];
      const completed = orders.filter(o => o.status==='completed');
      const earnings  = completed.reduce((s,o)=>s+(o.cost||0),0);

      return `
      <div class="entity-card ${isLow?'card-warning':''}">

        <!-- Header -->
        <div class="entity-card-header">
          <div class="entity-avatar worker-avatar status-${w.status}">
            ${w.name.charAt(0)}
          </div>
          <div class="entity-info">
            <h3>${utils.esc(w.name)}</h3>
            <a href="tel:${w.phone}" class="phone-link dir-ltr" onclick="event.stopPropagation()">
              ${utils.esc(w.phone)}
            </a>
          </div>
          ${utils.statusBadge(w.status)}
        </div>

        <!-- Meta -->
        <div class="entity-meta">
          <div class="meta-item">
            <span class="meta-icon">📍</span>
            <span>${utils.esc(w.area||'—')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">✅</span>
            <span>${completed.length} ${t('totalCompleted')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-icon">⭐</span>
            <span>${w.average_rating !== null && w.average_rating !== undefined
                     ? utils.stars(w.average_rating)
                     : `<span class="text-muted">${t('noRating')}</span>`}</span>
          </div>
          ${isLow ? `
          <div class="meta-item warn-meta">
            <span class="meta-icon">⚠️</span>
            <span>${t('alertLowRatingWorker', {rating: w.average_rating})}</span>
          </div>` : ''}
          ${earnings > 0 ? `
          <div class="meta-item">
            <span class="meta-icon">💰</span>
            <span class="amount-sm">${utils.currency(earnings)}</span>
          </div>` : ''}
        </div>

        <!-- Quick status toggle — no page reload -->
        <div class="quick-status-row">
          <span class="quick-status-label">${t('status')}:</span>
          ${['available','busy','off'].map(s => `
            <button class="status-pill ${w.status===s?'status-pill-active status-pill-'+s:''}"
                    onclick="workersPage.quickUpdateStatus('${w.id}','${s}', this)">
              ${t(s)}
            </button>`).join('')}
        </div>

        <!-- Actions -->
        <div class="entity-actions">
          <button class="btn btn-sm btn-outline" onclick="workersPage.openHistory('${w.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${t('workerHistory')}
          </button>
          <button class="btn btn-sm btn-ghost" onclick="workersPage.openEditModal('${w.id}')">
            ${t('edit')}
          </button>
          <button class="btn btn-sm btn-danger-ghost" onclick="workersPage.confirmDelete('${w.id}','${utils.esc(w.name)}')">
            ${t('delete')}
          </button>
        </div>
      </div>`;
    }).join('');
  },

  // ════════════════════════════════════════════════════════
  // QUICK STATUS (no full reload — update in-place)
  // ════════════════════════════════════════════════════════
  async quickUpdateStatus(id, newStatus, clickedBtn) {
    const t = (k) => window.i18n.t(k);

    // Optimistic UI update
    const w  = this.workers.find(x => x.id === id);
    const wf = this.filtered.find(x => x.id === id);
    if (w)  w.status  = newStatus;
    if (wf) wf.status = newStatus;

    // Update pill buttons in the card immediately
    const row = clickedBtn.closest('.quick-status-row');
    if (row) {
      row.querySelectorAll('.status-pill').forEach(btn => {
        const s = btn.textContent.trim();
        const isThis = btn === clickedBtn;
        btn.className = `status-pill ${isThis ? `status-pill-active status-pill-${newStatus}` : ''}`;
      });
    }

    // Update avatar color & status badge in the card header
    const card = clickedBtn.closest('.entity-card');
    if (card) {
      const avatar = card.querySelector('.worker-avatar');
      if (avatar) {
        avatar.className = `entity-avatar worker-avatar status-${newStatus}`;
      }
      const badge = card.querySelector('.badge');
      if (badge) badge.outerHTML = utils.statusBadge(newStatus);
    }

    // Update stats bar & tabs in-place
    this.updateStatsBar();
    this.renderStatusTabs();

    // Persist to server
    try {
      await api.workers.update(id, { status: newStatus });
      utils.toast(t('success'), 'success');
    } catch {
      // Revert on failure
      if (w)  w.status  = w.status;
      if (wf) wf.status = wf.status;
      utils.toast(t('error'), 'error');
      this.renderGrid();
    }
  },

  // ════════════════════════════════════════════════════════
  // ADD / EDIT MODAL
  // ════════════════════════════════════════════════════════
  openAddModal() {
    const t = (k) => window.i18n.t(k);
    document.getElementById('worker-modal-title').textContent = t('addWorker');
    ['worker-form-id','worker-name','worker-phone','worker-area','worker-address','worker-national-id']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.classList.remove('field-error'); }
      });
    document.getElementById('worker-status').value = 'available';
    utils.showModal('modal-worker-form');
    setTimeout(() => document.getElementById('worker-name')?.focus(), 200);
  },

  openEditModal(id) {
    const t = (k) => window.i18n.t(k);
    const w = this.workers.find(x => x.id === id);
    if (!w) return;
    document.getElementById('worker-modal-title').textContent = t('editWorker');
    document.getElementById('worker-form-id').value       = w.id;
    document.getElementById('worker-name').value          = w.name;
    document.getElementById('worker-phone').value         = w.phone;
    document.getElementById('worker-area').value          = w.area        || '';
    document.getElementById('worker-address').value       = w.address     || '';
    document.getElementById('worker-national-id').value   = w.national_id || '';
    document.getElementById('worker-status').value        = w.status;
    ['worker-name','worker-phone','worker-area','worker-address','worker-national-id']
      .forEach(id => document.getElementById(id)?.classList.remove('field-error'));
    utils.hideModal('modal-worker-history');
    utils.showModal('modal-worker-form');
  },

  _validateWorkerForm() {
    let ok = true;
    const required = ['worker-name','worker-phone'];
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('field-error', empty);
      if (empty) ok = false;
    });
    // National ID: if filled must be 14 digits
    const nid = document.getElementById('worker-national-id');
    if (nid && nid.value.trim() && nid.value.trim().length !== 14) {
      nid.classList.add('field-error');
      ok = false;
      utils.toast(window.i18n.current==='ar'?'رقم الهوية يجب أن يكون 14 رقم':'National ID must be 14 digits','error');
    }
    return ok;
  },

  async saveWorker() {
    if (!this._validateWorkerForm()) return;
    const t   = (k) => window.i18n.t(k);
    const id  = document.getElementById('worker-form-id').value;
    const btn = document.getElementById('wrk-save-btn');
    const data = {
      name       : document.getElementById('worker-name').value.trim(),
      phone      : document.getElementById('worker-phone').value.trim(),
      area       : document.getElementById('worker-area').value.trim(),
      address    : document.getElementById('worker-address').value.trim(),
      national_id: document.getElementById('worker-national-id').value.trim(),
      status     : document.getElementById('worker-status').value,
    };
    btn.disabled = true;
    try {
      if (id) await api.workers.update(id, data);
      else     await api.workers.create(data);
      utils.toast(t('success'), 'success');
      utils.hideModal('modal-worker-form');
      await this.loadData();
    } catch {
      utils.toast(t('error'), 'error');
    } finally {
      btn.disabled = false;
    }
  },

  // ════════════════════════════════════════════════════════
  // CONFIRM DELETE
  // ════════════════════════════════════════════════════════
  confirmDelete(id, name) {
    const lang = window.i18n.current;
    document.getElementById('confirm-delete-msg-w').textContent =
      lang==='ar' ? `هل تريد حذف العامل "${name}"؟` : `Delete worker "${name}"?`;
    const btn    = document.getElementById('confirm-delete-btn-w');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => this.deleteWorker(id));
    utils.showModal('modal-confirm-delete-w');
  },

  async deleteWorker(id) {
    const t = (k) => window.i18n.t(k);
    try {
      await api.workers.remove(id);
      utils.toast(t('success'), 'success');
      utils.hideModal('modal-confirm-delete-w');
      await this.loadData();
    } catch { utils.toast(t('error'), 'error'); }
  },

  // ════════════════════════════════════════════════════════
  // HISTORY MODAL
  // ════════════════════════════════════════════════════════
  async openHistory(id) {
    utils.showModal('modal-worker-history');
    document.getElementById('worker-history-body').innerHTML =
      `<div class="loading-spinner"><div class="spinner"></div></div>`;
    document.getElementById('hist-wrk-name').textContent = '…';
    document.getElementById('hist-wrk-meta').textContent = '';

    try {
      const w = await api.workers.get(id);
      document.getElementById('hist-wrk-name').textContent  = w.name;
      document.getElementById('hist-wrk-meta').textContent  =
        `${w.phone}${w.area ? ' · ' + w.area : ''}`;
      document.getElementById('hist-wrk-edit-btn').onclick  = () => this.openEditModal(id);
      document.getElementById('worker-history-body').innerHTML = this._buildHistoryHTML(w);
    } catch {
      document.getElementById('worker-history-body').innerHTML =
        `<div class="empty-card"><p>${window.i18n.t('error')}</p></div>`;
    }
  },

  _buildHistoryHTML(w) {
    const t       = (k) => window.i18n.t(k);
    const lang    = window.i18n.current;
    const orders  = (w.orders_history || []).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const completed = orders.filter(o => o.status === 'completed');
    const regular   = completed.filter(o => o.service_type === 'regular');
    const deep      = completed.filter(o => o.service_type === 'deep');
    const earnings  = completed.reduce((s,o) => s+(o.cost||0), 0);

    // Area breakdown
    const areaCounts = {};
    orders.forEach(o => { if (o.area) areaCounts[o.area] = (areaCounts[o.area]||0)+1; });
    const topAreas = Object.entries(areaCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Avg rating from customer_feedback (customers rate workers)
    const fbOrders = orders.filter(o => o.customer_feedback?.rating);
    const avgRating = fbOrders.length
      ? (fbOrders.reduce((s,o)=>s+o.customer_feedback.rating, 0) / fbOrders.length).toFixed(1)
      : null;

    // ── Summary ─────────────────────────────────────────
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
          <span class="hist-stat-num">${regular.length}</span>
          <span class="hist-stat-lbl">${t('regular')}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num">${deep.length}</span>
          <span class="hist-stat-lbl">${t('deep')}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num amount-sm">${utils.currency(earnings)}</span>
          <span class="hist-stat-lbl">${lang==='ar'?'إجمالي الأوردرات':'Total Value'}</span>
        </div>
        <div class="hist-stat">
          <span class="hist-stat-num">${avgRating ? utils.stars(Number(avgRating)) : '—'}</span>
          <span class="hist-stat-lbl">${t('avgRating')}</span>
        </div>
      </div>`;

    // ── Performance bar ──────────────────────────────────
    const totalO = orders.length || 1;
    const perfHTML = completed.length ? `
      <div class="hist-section">
        <h4 class="hist-section-title">📊 ${lang==='ar'?'توزيع نوع الخدمة':'Service Breakdown'}</h4>
        <div class="perf-bars">
          <div class="perf-bar-row">
            <span class="perf-lbl">${t('regular')}</span>
            <div class="perf-track">
              <div class="perf-fill regular-fill" style="width:${Math.round(regular.length/totalO*100)}%"></div>
            </div>
            <span class="perf-val">${regular.length}</span>
          </div>
          <div class="perf-bar-row">
            <span class="perf-lbl">${t('deep')}</span>
            <div class="perf-track">
              <div class="perf-fill deep-fill" style="width:${Math.round(deep.length/totalO*100)}%"></div>
            </div>
            <span class="perf-val">${deep.length}</span>
          </div>
        </div>
      </div>` : '';

    // ── Area breakdown ───────────────────────────────────
    const areasHTML = topAreas.length ? `
      <div class="hist-section">
        <h4 class="hist-section-title">📍 ${lang==='ar'?'المناطق المخدومة':'Areas Served'}</h4>
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

    // ── Orders table ─────────────────────────────────────
    if (!orders.length) {
      return summaryHTML + `<div class="empty-card" style="margin-top:16px"><p>${t('noOrdersYet')}</p></div>`;
    }

    const tableHTML = `
      <div class="hist-section">
        <h4 class="hist-section-title">📋 ${lang==='ar'?'سجل الأوردرات':'Order History'}</h4>
        <div class="orders-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t('date')}</th>
                <th>${t('area')}</th>
                <th>${t('serviceType')}</th>
                <th>${t('apartmentSize')}</th>
                <th>${t('cost')}</th>
                <th>${t('status')}</th>
                <th>${lang==='ar'?'تقييم العميل له':'Customer Rating'}</th>
                <th>${t('notesLabel')}</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr class="tr-${o.status}">
                  <td>${utils.formatDate(o.date)}</td>
                  <td>${utils.esc(o.area)}</td>
                  <td>${utils.statusBadge(o.service_type)}</td>
                  <td>${o.apartment_size ? o.apartment_size+' '+t('sqm') : '—'}</td>
                  <td class="amount">${utils.currency(o.cost)}</td>
                  <td>${utils.statusBadge(o.status)}</td>
                  <td>${o.customer_feedback?.rating ? utils.stars(o.customer_feedback.rating) : '<span class="text-muted">—</span>'}</td>
                  <td class="notes-cell">${utils.esc(o.customer_feedback?.notes || '—')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    return summaryHTML + perfHTML + areasHTML + tableHTML;
  },
};
