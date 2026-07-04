// ============================================================
// public/js/pages/callcenter.js — Call Center & Dispatch
// Phase 2: Full rewrite with filters, debounce, validation
// ============================================================

const callcenterPage = {

  // ── State ────────────────────────────────────────────────
  customers       : [],
  workers         : [],
  orders          : [],
  filteredOrders  : [],
  areaWorkers     : [],          // workers found for the currently typed area
  activeFilter    : 'all',       // status tab
  searchQuery     : '',
  dateFilter      : 'all',       // 'today' | 'all'
  _areaDebounce   : null,        // debounce timer
  _waTemplates    : null,        // cached WA templates from settings

  // ════════════════════════════════════════════════════════
  // RENDER — page shell
  // ════════════════════════════════════════════════════════
  async render() {
    const t = (k) => window.i18n.t(k);

    document.getElementById('page-content').innerHTML = `

      <!-- ── Page header ──────────────────────────────── -->
      <div class="page-header">
        <h1 data-i18n="navCallCenter">${t('navCallCenter')}</h1>
        <button class="btn btn-primary" id="btn-new-order"
                onclick="callcenterPage.openNewOrderModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span data-i18n="newOrder">${t('newOrder')}</span>
        </button>
      </div>

      <!-- ── Toolbar: search + date filter ────────────── -->
      <div class="cc-toolbar">
        <div class="search-bar cc-search">
          <svg class="search-icon" width="17" height="17" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="search-input" id="cc-search-input"
                 placeholder="${t('searchPlaceholder')}"
                 oninput="callcenterPage.onSearch(this.value)">
        </div>
        <div class="date-toggle">
          <button class="filter-tab ${this.dateFilter==='today'?'active':''}"
                  id="dt-today" onclick="callcenterPage.setDateFilter('today', this)">
            📅 ${t('todayAgenda')}
          </button>
          <button class="filter-tab ${this.dateFilter==='all'?'active':''}"
                  id="dt-all" onclick="callcenterPage.setDateFilter('all', this)">
            ${t('allOrders')}
          </button>
        </div>
      </div>

      <!-- ── Status filter tabs ────────────────────────── -->
      <div class="status-tabs" id="status-tabs">
        <!-- filled dynamically after data loads -->
      </div>

      <!-- ── Orders table ──────────────────────────────── -->
      <div id="cc-orders-wrap">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>

      <!-- ════════════════════════════════════════════════
           MODAL: NEW ORDER
      ════════════════════════════════════════════════ -->
      <div class="modal-overlay" id="modal-new-order">
        <div class="modal modal-lg">

          <div class="modal-header">
            <div>
              <h2 data-i18n="newOrder">${t('newOrder')}</h2>
              <p class="modal-subtitle" id="order-form-step-label">
                ${t('customerName')} → ${t('area')} → ${t('assignWorker')}
              </p>
            </div>
            <button class="modal-close" onclick="utils.hideModal('modal-new-order')">✕</button>
          </div>

          <div class="modal-body">

            <!-- ── SECTION A: Customer ─────────────────── -->
            <div class="form-section">
              <div class="form-section-title">
                <span class="form-section-num">١</span>
                ${t('customerName')}
              </div>

              <div class="form-group">
                <div class="customer-select-row">
                  <select id="order-customer-id" class="form-control"
                          onchange="callcenterPage.onCustomerChange(this.value)">
                    <option value="">${t('selectCustomer')}</option>
                  </select>
                  <button class="btn btn-ghost btn-sm" id="btn-new-cust"
                          onclick="callcenterPage.toggleInlineCustomer()">
                    +&nbsp;${t('createNew')}
                  </button>
                </div>
                <div id="customer-alert" class="alert-banner hidden"></div>
              </div>

              <!-- Inline new customer -->
              <div id="inline-customer-fields" class="hidden">
                <div class="inline-form-card">
                  <p class="inline-form-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    ${t('addCustomer')}
                  </p>
                  <div class="form-grid">
                    <div class="form-group">
                      <label>${t('customerName')} *</label>
                      <input type="text" id="new-cust-name" class="form-control"
                             placeholder="${t('customerName')}">
                    </div>
                    <div class="form-group">
                      <label>${t('phone')} *</label>
                      <input type="tel" id="new-cust-phone" class="form-control"
                             dir="ltr" placeholder="05XXXXXXXX"
                             oninput="callcenterPage.formatPhone(this)">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── SECTION B: Order details ───────────── -->
            <div class="form-section">
              <div class="form-section-title">
                <span class="form-section-num">٢</span>
                ${t('detailedAddress')}
              </div>
              <div class="form-grid">

                <div class="form-group">
                  <label>${t('area')} *</label>
                  <input type="text" id="order-area" class="form-control"
                         placeholder="${t('area')}"
                         oninput="callcenterPage.onAreaInput(this.value)">
                </div>

                <div class="form-group">
                  <label>${t('detailedAddress')} *</label>
                  <input type="text" id="order-address" class="form-control"
                         placeholder="${t('detailedAddress')}">
                </div>

                <div class="form-group">
                  <label>${t('apartmentSize')} *</label>
                  <div class="input-with-unit">
                    <input type="number" id="order-apt-size" class="form-control"
                           min="20" max="1000" placeholder="120">
                    <span class="input-unit">${t('sqm')}</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>${t('cost')} *</label>
                  <div class="input-with-unit">
                    <input type="number" id="order-cost" class="form-control"
                           min="0" placeholder="250">
                    <span class="input-unit">${t('currency')}</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>${t('serviceType')}</label>
                  <select id="order-service-type" class="form-control">
                    <option value="regular">${t('regular')}</option>
                    <option value="deep">${t('deep')}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>${t('date')}</label>
                  <input type="date" id="order-date" class="form-control"
                         value="${utils.today()}">
                </div>

                <div class="form-group">
                  <label>
                    🕐 ${window.i18n.current === 'ar' ? 'موعد الأوردر (اختياري)' : 'Scheduled Time (optional)'}
                  </label>
                  <input type="time" id="order-scheduled-time" class="form-control" dir="ltr">
                </div>

              </div>
            </div>

            <!-- ── SECTION C: Worker assignment ──────── -->
            <div class="form-section">
              <div class="form-section-title">
                <span class="form-section-num">٣</span>
                ${t('availableWorkers')}
                <span class="area-tag" id="area-tag"></span>
                <span class="worker-loading hidden" id="worker-loading">
                  <span class="mini-spinner"></span>
                </span>
              </div>
              <div id="worker-alert" class="alert-banner hidden"></div>
              <div id="workers-grid" class="workers-pick-grid">
                <p class="hint-text">
                  ← ${t('area')} ${window.i18n.current==='ar'?'أدخل المنطقة أولاً لعرض العمالة المتاحة':'Enter an area above to see available workers'}
                </p>
              </div>
            </div>

          </div><!-- /modal-body -->

          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-new-order')">
              ${t('cancel')}
            </button>
            <button class="btn btn-primary" id="btn-submit-order"
                    onclick="callcenterPage.submitNewOrder()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ${t('submit')}
            </button>
          </div>

        </div>
      </div>

      <!-- ════════════════════════════════════════════════
           MODAL: ORDER DETAIL
      ════════════════════════════════════════════════ -->
      <div class="modal-overlay" id="modal-order-detail">
        <div class="modal modal-lg">
          <div class="modal-header">
            <div>
              <h2>${t('order')} <span id="detail-order-num" class="order-num-badge"></span></h2>
              <p class="modal-subtitle" id="detail-order-date"></p>
            </div>
            <button class="modal-close" onclick="utils.hideModal('modal-order-detail')">✕</button>
          </div>
          <div class="modal-body" id="order-detail-body">
            <div class="loading-spinner"><div class="spinner"></div></div>
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
      const [customers, workers, orders, settings] = await Promise.all([
        api.customers.list(),
        api.workers.list(),
        api.orders.list(),
        api.settings.get().catch(() => null),
      ]);
      this.customers    = customers;
      this.workers      = workers;
      this.orders       = orders;
      this._waTemplates = settings?.wa_templates || null;
      this.applyFilters();
    } catch {
      utils.toast(window.i18n.t('error'), 'error');
    }
  },

  // ── Get WA message from saved template ───────────────────
  _waMessage(type, link) {
    // type: 'customer' | 'worker'
    const lang = window.i18n.current;
    const key  = `${type}_${lang}`;
    const tmpl = this._waTemplates?.[key] || window.i18n.t(
      type === 'customer' ? 'waMessageCustomer' : 'waMessageWorker', { link }
    );
    return tmpl.replace('{link}', link);
  },

  // ════════════════════════════════════════════════════════
  // FILTERING
  // ════════════════════════════════════════════════════════
  applyFilters() {
    let result = [...this.orders];

    // Date filter
    if (this.dateFilter === 'today') {
      const today = utils.today();
      result = result.filter(o => o.date === today);
    }

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.area          || '').toLowerCase().includes(q) ||
        (o.worker_name   || '').toLowerCase().includes(q) ||
        (o.id            || '').toLowerCase().includes(q)
      );
    }

    // Status tab
    if (this.activeFilter !== 'all') {
      result = result.filter(o => o.status === this.activeFilter);
    }

    this.filteredOrders = result;
    this.renderStatusTabs();
    this.renderOrdersTable();
  },

  onSearch(val) {
    this.searchQuery = val.trim();
    this.applyFilters();
  },

  setDateFilter(val, btn) {
    this.dateFilter = val;
    document.querySelectorAll('.date-toggle .filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.applyFilters();
  },

  setStatusFilter(status, btn) {
    this.activeFilter = status;
    document.querySelectorAll('.status-tabs .stab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.applyFilters();
  },

  // ════════════════════════════════════════════════════════
  // RENDER: STATUS TABS
  // ════════════════════════════════════════════════════════
  renderStatusTabs() {
    const t      = (k) => window.i18n.t(k);
    const pool   = this.dateFilter === 'today'
      ? this.orders.filter(o => o.date === utils.today())
      : this.orders;

    const counts = {
      all       : pool.length,
      pending   : pool.filter(o => o.status === 'pending').length,
      dispatched: pool.filter(o => o.status === 'dispatched').length,
      completed : pool.filter(o => o.status === 'completed').length,
      cancelled : pool.filter(o => o.status === 'cancelled').length,
    };

    const tabs = [
      { key: 'all',        label: t('allOrders'),  cls: '' },
      { key: 'pending',    label: t('pending'),     cls: 'tab-pending' },
      { key: 'dispatched', label: t('dispatched'),  cls: 'tab-dispatched' },
      { key: 'completed',  label: t('completed'),   cls: 'tab-completed' },
      { key: 'cancelled',  label: t('cancelled'),   cls: 'tab-cancelled' },
    ];

    document.getElementById('status-tabs').innerHTML = tabs.map(tab => `
      <button class="stab ${tab.cls} ${this.activeFilter === tab.key ? 'active' : ''}"
              onclick="callcenterPage.setStatusFilter('${tab.key}', this)">
        ${tab.label}
        <span class="stab-count">${counts[tab.key]}</span>
      </button>
    `).join('');
  },

  // ════════════════════════════════════════════════════════
  // RENDER: ORDERS TABLE
  // ════════════════════════════════════════════════════════
  renderOrdersTable() {
    const t  = (k) => window.i18n.t(k);
    const el = document.getElementById('cc-orders-wrap');
    const all = this.filteredOrders;

    if (!all.length) {
      el.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">📋</div>
          <p>${this.searchQuery || this.activeFilter !== 'all'
               ? (window.i18n.current === 'ar' ? 'لا توجد نتائج للفلتر الحالي' : 'No results for the current filter')
               : t('noOrdersToday')}</p>
          ${!this.searchQuery && this.activeFilter === 'all' ? `
            <button class="btn btn-primary" onclick="callcenterPage.openNewOrderModal()">
              + ${t('newOrder')}
            </button>` : ''}
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="orders-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th>${t('customerName')}</th>
              <th class="col-hide-sm">${t('area')}</th>
              <th>${t('serviceType')}</th>
              <th class="col-hide-sm">${t('cost')}</th>
              <th class="col-hide-md">${t('date')}</th>
              <th>${t('status')}</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${all.map((o, i) => `
              <tr class="tr-${o.status}" onclick="callcenterPage.openOrderDetail('${o.id}')"
                  style="cursor:pointer">
                <td class="order-num col-num">${i + 1}</td>
                <td>
                  <div class="cell-name">
                    <strong>${utils.esc(o.customer_name || '—')}</strong>
                    ${o.worker_name
                      ? `<span class="cell-sub">👷 ${utils.esc(o.worker_name)}</span>`
                      : ''}
                  </div>
                </td>
                <td class="col-hide-sm">${utils.esc(o.area)}</td>
                <td>${utils.statusBadge(o.service_type)}</td>
                <td class="amount col-hide-sm">${utils.currency(o.cost)}</td>
                <td class="col-hide-md">${utils.formatDate(o.date)}</td>
                <td>
                  ${utils.statusBadge(o.status)}
                  ${o.time_status && o.time_status !== 'none'
                    ? `<br>${utils.timeStatusBadge(o.time_status, o.scheduled_time)}`
                    : ''}
                </td>
                <td class="col-actions" onclick="event.stopPropagation()">
                  <button class="btn btn-xs btn-outline"
                          onclick="callcenterPage.openOrderDetail('${o.id}')">
                    ${t('view')}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="table-count">
          ${window.i18n.current === 'ar'
            ? `${all.length} أوردر`
            : `${all.length} order${all.length !== 1 ? 's' : ''}`}
        </p>
      </div>`;
  },

  // ════════════════════════════════════════════════════════
  // NEW ORDER MODAL
  // ════════════════════════════════════════════════════════
  openNewOrderModal() {
    // Reset form state
    this.areaWorkers = [];
    const sel = document.getElementById('order-customer-id');
    if (sel) {
      this.populateCustomerSelect();
      sel.value = '';
    }
    document.getElementById('customer-alert')?.classList.add('hidden');
    document.getElementById('worker-alert')?.classList.add('hidden');
    document.getElementById('inline-customer-fields')?.classList.add('hidden');

    const fields = ['order-area','order-address','order-apt-size','order-cost',
                    'new-cust-name','new-cust-phone','order-scheduled-time'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.classList.remove('field-error'); }
    });

    const dateEl = document.getElementById('order-date');
    if (dateEl) dateEl.value = utils.today();

    const svcEl = document.getElementById('order-service-type');
    if (svcEl) svcEl.value = 'regular';

    const grid = document.getElementById('workers-grid');
    if (grid) {
      const lang = window.i18n.current;
      grid.innerHTML = `<p class="hint-text">${lang === 'ar'
        ? 'أدخل المنطقة أولاً لعرض العمالة المتاحة'
        : 'Enter an area to see available workers'}</p>`;
      delete grid.dataset.selectedWorker;
    }

    const areaTag = document.getElementById('area-tag');
    if (areaTag) areaTag.textContent = '';

    utils.showModal('modal-new-order');
  },

  populateCustomerSelect() {
    const sel = document.getElementById('order-customer-id');
    if (!sel) return;
    const t = (k) => window.i18n.t(k);
    sel.innerHTML =
      `<option value="">${t('selectCustomer')}</option>` +
      this.customers.map(c => {
        const warn = utils.isLowRating(c.average_rating) ? ' ⚠️' : '';
        return `<option value="${c.id}">${utils.esc(c.name)} — ${utils.esc(c.phone)}${warn}</option>`;
      }).join('');
  },

  toggleInlineCustomer() {
    const el  = document.getElementById('inline-customer-fields');
    const btn = document.getElementById('btn-new-cust');
    const t   = (k) => window.i18n.t(k);
    const isHidden = el.classList.toggle('hidden');
    btn.textContent = isHidden ? `+ ${t('createNew')}` : `✕ ${t('cancel')}`;
    if (!isHidden) {
      document.getElementById('order-customer-id').value = '';
      document.getElementById('customer-alert').classList.add('hidden');
    }
  },

  // ── Customer select change ────────────────────────────
  onCustomerChange(customerId) {
    const alertEl = document.getElementById('customer-alert');
    if (!customerId) { alertEl.classList.add('hidden'); return; }

    const cust = this.customers.find(c => c.id === customerId);
    if (!cust) return;

    if (utils.isLowRating(cust.average_rating)) {
      alertEl.className = 'alert-banner alert-warning';
      alertEl.innerHTML = `
        <strong>⚠️ ${window.i18n.current === 'ar' ? 'تنبيه' : 'Warning'}:</strong>
        ${window.i18n.t('alertLowRatingCustomer', { rating: cust.average_rating })}
        &nbsp;&mdash;&nbsp;
        <button class="btn btn-xs btn-ghost"
                onclick="callcenterPage.viewCustomerHistory('${cust.id}')">
          ${window.i18n.t('customerHistory')}
        </button>`;
    } else {
      alertEl.classList.add('hidden');
    }
  },

  viewCustomerHistory(id) {
    utils.hideModal('modal-new-order');
    app.navigate('customers').then(() => customersPage.openHistory(id));
  },

  // ── Phone formatter ───────────────────────────────────
  formatPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    input.value = v;
  },

  // ── Area input with 350ms debounce ────────────────────
  onAreaInput(area) {
    clearTimeout(this._areaDebounce);

    const areaTag = document.getElementById('area-tag');
    const loading = document.getElementById('worker-loading');
    const grid    = document.getElementById('workers-grid');
    const lang    = window.i18n.current;

    if (!area.trim()) {
      if (areaTag) areaTag.textContent = '';
      loading?.classList.add('hidden');
      grid.innerHTML = `<p class="hint-text">${lang === 'ar'
        ? 'أدخل المنطقة أولاً لعرض العمالة المتاحة'
        : 'Enter an area to see available workers'}</p>`;
      delete grid.dataset.selectedWorker;
      return;
    }

    // Show loading immediately
    loading?.classList.remove('hidden');

    this._areaDebounce = setTimeout(async () => {
      try {
        const workers = await api.workers.list({ area: area.trim(), status: 'available' });
        this.areaWorkers = workers;
        if (areaTag) areaTag.textContent = area.trim();
        loading?.classList.add('hidden');
        this.renderWorkerCards(workers);
      } catch {
        loading?.classList.add('hidden');
      }
    }, 350);
  },

  renderWorkerCards(workers) {
    const t    = (k) => window.i18n.t(k);
    const grid = document.getElementById('workers-grid');
    if (!grid) return;

    if (!workers.length) {
      grid.innerHTML = `
        <div class="no-workers-msg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" opacity=".4">
            <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
          </svg>
          <p>${t('noAvailableWorkers')}</p>
          <small>${window.i18n.current === 'ar'
            ? 'يمكنك حفظ الأوردر بدون تسكين وتسكينه لاحقاً'
            : 'You can save without assigning and dispatch later'}</small>
        </div>`;
      return;
    }

    grid.innerHTML = workers.map(w => `
      <div class="worker-pick-card ${utils.isLowRating(w.average_rating) ? 'low-rating' : ''}"
           onclick="callcenterPage.selectWorker('${w.id}', this)">
        <div class="worker-pick-avatar">${w.name.charAt(0)}</div>
        <div class="worker-pick-info">
          <strong>${utils.esc(w.name)}</strong>
          <span class="wpc-area">📍 ${utils.esc(w.area)}</span>
          <div class="wpc-meta">
            ${utils.stars(w.average_rating)}
            <span class="wpc-orders">${w.total_orders || 0} ${t('totalOrders')}</span>
          </div>
        </div>
        ${utils.isLowRating(w.average_rating)
          ? `<span class="wpc-warn-dot" title="${t('alertLowRatingWorker', {rating: w.average_rating})}">⚠️</span>`
          : '<div class="worker-pick-check hidden">✓</div>'}
      </div>
    `).join('');
  },

  selectWorker(workerId, card) {
    // Deselect all
    document.querySelectorAll('.worker-pick-card').forEach(c => {
      c.classList.remove('selected');
      c.querySelector('.worker-pick-check')?.classList.add('hidden');
    });

    // Select this card
    card.classList.add('selected');
    card.querySelector('.worker-pick-check')?.classList.remove('hidden');

    // Store selection on the grid
    const grid = document.getElementById('workers-grid');
    if (grid) grid.dataset.selectedWorker = workerId;

    // Smart alert — look in areaWorkers first, then global workers
    const worker = this.areaWorkers.find(w => w.id === workerId)
                || this.workers.find(w => w.id === workerId);
    const alertEl = document.getElementById('worker-alert');

    if (worker && utils.isLowRating(worker.average_rating)) {
      alertEl.className = 'alert-banner alert-warning';
      alertEl.innerHTML = `
        <strong>⚠️ ${window.i18n.current === 'ar' ? 'تنبيه' : 'Warning'}:</strong>
        ${window.i18n.t('alertLowRatingWorker', { rating: worker.average_rating })}`;
    } else {
      alertEl?.classList.add('hidden');
    }
  },

  // ── Form validation ───────────────────────────────────
  validateForm() {
    const isInlineOpen = !document.getElementById('inline-customer-fields').classList.contains('hidden');
    let valid = true;

    const required = [
      { id: 'order-area',     label: window.i18n.t('area') },
      { id: 'order-address',  label: window.i18n.t('detailedAddress') },
      { id: 'order-apt-size', label: window.i18n.t('apartmentSize') },
      { id: 'order-cost',     label: window.i18n.t('cost') },
    ];

    if (isInlineOpen) {
      required.push({ id: 'new-cust-name',  label: window.i18n.t('customerName') });
      required.push({ id: 'new-cust-phone', label: window.i18n.t('phone') });
    }

    required.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('field-error', empty);
      if (empty) valid = false;
    });

    // Customer required if not inline
    if (!isInlineOpen) {
      const sel = document.getElementById('order-customer-id');
      const empty = !sel?.value;
      sel?.classList.toggle('field-error', empty);
      if (empty) {
        valid = false;
        utils.toast(window.i18n.current === 'ar' ? 'يرجى اختيار عميل أو إضافة جديد' : 'Please select or add a customer', 'error');
      }
    }

    return valid;
  },

  // ── Submit new order ──────────────────────────────────
  async submitNewOrder() {
    const t   = (k) => window.i18n.t(k);
    const btn = document.getElementById('btn-submit-order');

    if (!this.validateForm()) return;

    btn.disabled = true;
    btn.innerHTML = `<span class="mini-spinner"></span> ${window.i18n.current === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}`;

    const isInlineOpen = !document.getElementById('inline-customer-fields').classList.contains('hidden');
    let customerId = document.getElementById('order-customer-id').value;

    // Create customer if inline form used
    if (isInlineOpen) {
      const name  = document.getElementById('new-cust-name').value.trim();
      const phone = document.getElementById('new-cust-phone').value.trim();
      const area  = document.getElementById('order-area').value.trim();
      const addr  = document.getElementById('order-address').value.trim();
      try {
        const newCust = await api.customers.create({ name, phone, area, address: addr });
        customerId = newCust.id;
        this.customers.push(newCust);
      } catch {
        utils.toast(t('error'), 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${t('submit')}`;
        return;
      }
    }

    const scheduledTime = document.getElementById('order-scheduled-time')?.value || null;
    const payload = {
      customer_id    : customerId,
      area           : document.getElementById('order-area').value.trim(),
      address        : document.getElementById('order-address').value.trim(),
      apartment_size : document.getElementById('order-apt-size').value,
      service_type   : document.getElementById('order-service-type').value,
      cost           : document.getElementById('order-cost').value,
      date           : document.getElementById('order-date').value,
      scheduled_time : scheduledTime || null,
    };

    try {
      const newOrder = await api.orders.create(payload);

      // Auto-dispatch if worker selected
      const selectedWorker = document.getElementById('workers-grid')?.dataset?.selectedWorker;
      if (selectedWorker) {
        await api.orders.update(newOrder.id, { worker_id: selectedWorker, status: 'dispatched' });
        utils.toast(
          window.i18n.current === 'ar'
            ? '✅ تم حفظ الأوردر وتسكين العامل!'
            : '✅ Order saved and worker assigned!',
          'success'
        );
      } else {
        utils.toast(
          window.i18n.current === 'ar'
            ? '✅ تم حفظ الأوردر — يمكن تسكين عامل لاحقاً'
            : '✅ Order saved — assign a worker later',
          'success'
        );
      }

      utils.hideModal('modal-new-order');
      await this.loadData();

      // Open the new order detail automatically
      setTimeout(() => this.openOrderDetail(newOrder.id), 400);

    } catch {
      utils.toast(t('error'), 'error');
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${t('submit')}`;
    }
  },

  // ════════════════════════════════════════════════════════
  // ORDER DETAIL MODAL
  // ════════════════════════════════════════════════════════
  async openOrderDetail(orderId) {
    const t = (k) => window.i18n.t(k);
    utils.showModal('modal-order-detail');

    // Show loading inside modal body
    document.getElementById('order-detail-body').innerHTML =
      `<div class="loading-spinner"><div class="spinner"></div></div>`;
    document.getElementById('detail-order-num').textContent = '';
    document.getElementById('detail-order-date').textContent = '';

    try {
      const order = await api.orders.get(orderId);

      // Header
      document.getElementById('detail-order-num').textContent =
        `#${orderId.slice(-6).toUpperCase()}`;
      document.getElementById('detail-order-date').textContent =
        utils.formatDate(order.date);

      document.getElementById('order-detail-body').innerHTML =
        this.buildDetailHTML(order, t);

    } catch {
      document.getElementById('order-detail-body').innerHTML =
        `<div class="empty-card"><p>${t('error')}</p></div>`;
    }
  },

  buildDetailHTML(order, t) {
    const custPhone  = order.customer?.phone || '';
    const wrkPhone   = order.worker?.phone   || '';
    const custFbUrl  = utils.feedbackUrl(order.id, 'customer');
    const wrkFbUrl   = utils.feedbackUrl(order.id, 'worker');
    const lang       = window.i18n.current;

    const waCustomerMsg = this._waMessage('customer', custFbUrl);
    const waWorkerMsg   = this._waMessage('worker',   wrkFbUrl);

    const WA_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>`;

    return `
      <!-- ── Order info grid ─────────────────────────── -->
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">${t('customerName')}</span>
          <span class="detail-value">
            <strong>${utils.esc(order.customer?.name || '—')}</strong>
            ${utils.isLowRating(order.customer?.average_rating)
              ? `<span class="warn-dot" title="${t('alertLowRatingCustomer', {rating: order.customer.average_rating})}"> ⚠️</span>`
              : ''}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('phone')}</span>
          <span class="detail-value dir-ltr">
            ${custPhone
              ? `<a href="tel:${custPhone}" class="phone-link">${utils.esc(custPhone)}</a>`
              : '—'}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('area')}</span>
          <span class="detail-value">${utils.esc(order.area)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('detailedAddress')}</span>
          <span class="detail-value">${utils.esc(order.address)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('serviceType')} / ${t('apartmentSize')}</span>
          <span class="detail-value">
            ${utils.statusBadge(order.service_type)}
            &nbsp;${order.apartment_size} ${t('sqm')}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('cost')}</span>
          <span class="detail-value amount">${utils.currency(order.cost)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${lang === 'ar' ? 'العامل المُسكَّن' : 'Assigned Worker'}</span>
          <span class="detail-value">
            ${order.worker
              ? `<strong>${utils.esc(order.worker.name)}</strong>
                 ${wrkPhone
                   ? `<a href="tel:${wrkPhone}" class="phone-link dir-ltr" style="margin-inline-start:6px">${utils.esc(wrkPhone)}</a>`
                   : ''}
                 ${utils.isLowRating(order.worker?.average_rating)
                   ? ` <span title="${t('alertLowRatingWorker', {rating: order.worker.average_rating})}">⚠️</span>`
                   : ''}`
              : `<span class="text-muted">${lang === 'ar' ? 'لم يُسكَّن بعد' : 'Not assigned yet'}</span>`}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${t('status')}</span>
          <span class="detail-value">${utils.statusBadge(order.status)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">🕐 ${lang === 'ar' ? 'موعد الأوردر' : 'Scheduled Time'}</span>
          <span class="detail-value">
            ${order.scheduled_time
              ? `<span class="sched-time">${utils.formatTime(order.scheduled_time)}</span>
                 ${utils.timeStatusBadge(order.time_status, order.scheduled_time)}`
              : `<span class="text-muted">${lang === 'ar' ? 'لم يحدد بعد' : 'Not set'}</span>`}
            <button class="btn btn-xs btn-ghost" style="margin-inline-start:8px"
                    onclick="callcenterPage.editScheduledTime('${order.id}', '${order.scheduled_time || ''}')">
              ✏️ ${lang === 'ar' ? 'تعديل' : 'Edit'}
            </button>
          </span>
        </div>
      </div>

      <!-- ── Action bar ──────────────────────────────── -->
      ${order.status === 'pending' ? `
        <div class="detail-action-bar">
          <div class="detail-action-label">
            ${lang === 'ar' ? '🚀 تسكين عامل وإرسال الأوردر' : '🚀 Assign Worker & Dispatch'}
          </div>
          <div class="assign-row">
            <select id="assign-worker-select" class="form-control assign-select">
              <option value="">${t('selectWorker')}</option>
              ${this.workers
                .filter(w => w.status === 'available')
                .map(w => {
                  const warn = utils.isLowRating(w.average_rating) ? ' ⚠️' : '';
                  return `<option value="${w.id}">${utils.esc(w.name)} — ${utils.esc(w.area)} ⭐${w.average_rating || '—'}${warn}</option>`;
                }).join('')}
            </select>
            <button class="btn btn-primary"
                    onclick="callcenterPage.assignWorker('${order.id}')">
              ${t('assignAndDispatch')}
            </button>
          </div>
          <div class="or-divider">${lang === 'ar' ? 'أو' : 'or'}</div>
          <button class="btn btn-danger" style="width:100%"
                  onclick="callcenterPage.updateStatus('${order.id}','cancelled')">
            ❌ ${t('cancelled')}
          </button>
        </div>` : ''}

      ${order.status === 'dispatched' ? `
        <div class="detail-action-bar">
          <div class="detail-action-label">
            ${lang === 'ar' ? '📝 تحديث حالة الأوردر' : '📝 Update Order Status'}
          </div>
          <div class="dispatch-actions">
            <button class="btn btn-success btn-full"
                    onclick="callcenterPage.updateStatus('${order.id}','completed')">
              ✅ ${lang === 'ar' ? 'تأكيد الإتمام' : 'Mark as Completed'}
            </button>
            <button class="btn btn-danger"
                    onclick="callcenterPage.updateStatus('${order.id}','cancelled')">
              ❌ ${t('cancelled')}
            </button>
          </div>
        </div>` : ''}

      ${order.status === 'completed' || order.status === 'cancelled' ? `
        <div class="detail-action-bar status-final">
          <span class="${order.status === 'completed' ? 'final-completed' : 'final-cancelled'}">
            ${order.status === 'completed'
              ? (lang === 'ar' ? '✅ الأوردر مكتمل' : '✅ Order Completed')
              : (lang === 'ar' ? '❌ الأوردر ملغي'   : '❌ Order Cancelled')}
          </span>
        </div>` : ''}

      <!-- ── Feedback links ──────────────────────────── -->
      ${(order.status === 'dispatched' || order.status === 'completed') ? `
        <div class="feedback-section">
          <h3 class="section-subtitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            ${t('feedbackLinks')}
          </h3>

          <!-- Customer link -->
          <div class="feedback-link-card">
            <div class="flc-label">
              <span class="flc-badge customer-badge">👤</span>
              ${t('customerFeedbackLink')}
              ${order.customer_feedback?.rating
                ? `<span class="flc-done">✓ ${utils.stars(order.customer_feedback.rating)}</span>`
                : ''}
            </div>
            <div class="flc-row">
              <input type="text" class="link-input dir-ltr" value="${custFbUrl}" readonly
                     onclick="this.select()">
              <div class="flc-btns">
                <button class="btn btn-sm btn-ghost"
                        onclick="utils.copyToClipboard('${custFbUrl}', this)">
                  📋 ${t('copyLink')}
                </button>
                ${custPhone ? `
                  <a class="btn btn-sm btn-whatsapp"
                     href="${utils.whatsappUrl(custPhone, waCustomerMsg)}" target="_blank"
                     rel="noopener">
                    ${WA_ICON} ${t('sendViaWhatsApp')}
                  </a>` : ''}
              </div>
            </div>
            ${order.customer_feedback?.notes
              ? `<div class="flc-note">💬 ${utils.esc(order.customer_feedback.notes)}</div>`
              : ''}
          </div>

          <!-- Worker link -->
          ${order.worker ? `
          <div class="feedback-link-card">
            <div class="flc-label">
              <span class="flc-badge worker-badge">👷</span>
              ${t('workerFeedbackLink')}
              ${order.worker_feedback?.rating
                ? `<span class="flc-done">✓ ${utils.stars(order.worker_feedback.rating)}</span>`
                : ''}
            </div>
            <div class="flc-row">
              <input type="text" class="link-input dir-ltr" value="${wrkFbUrl}" readonly
                     onclick="this.select()">
              <div class="flc-btns">
                <button class="btn btn-sm btn-ghost"
                        onclick="utils.copyToClipboard('${wrkFbUrl}', this)">
                  📋 ${t('copyLink')}
                </button>
                ${wrkPhone ? `
                  <a class="btn btn-sm btn-whatsapp"
                     href="${utils.whatsappUrl(wrkPhone, waWorkerMsg)}" target="_blank"
                     rel="noopener">
                    ${WA_ICON} ${t('sendViaWhatsApp')}
                  </a>` : ''}
              </div>
            </div>
            ${order.worker_feedback?.notes
              ? `<div class="flc-note">💬 ${utils.esc(order.worker_feedback.notes)}</div>`
              : ''}
          </div>` : ''}

        </div>` : ''}
    `;
  },

  // ── Assign worker (from detail modal) ────────────────
  async assignWorker(orderId) {
    const sel = document.getElementById('assign-worker-select');
    if (!sel?.value) {
      utils.toast(
        window.i18n.current === 'ar' ? 'يرجى اختيار عامل أولاً' : 'Please select a worker first',
        'error'
      );
      return;
    }
    try {
      await api.orders.update(orderId, { worker_id: sel.value, status: 'dispatched' });
      utils.toast(window.i18n.t('success'), 'success');
      await this.loadData();
      // Refresh modal with updated data
      await this.openOrderDetail(orderId);
    } catch { utils.toast(window.i18n.t('error'), 'error'); }
  },

  // ── Edit scheduled time (inline prompt) ─────────────────
  async editScheduledTime(orderId, currentTime) {
    const lang = window.i18n.current;
    const ar   = lang === 'ar';

    // Build a small inline time-picker inside an existing div
    const container = document.createElement('div');
    container.className = 'inline-time-editor';
    container.innerHTML = `
      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">
        ${ar ? 'تعديل موعد الأوردر:' : 'Edit scheduled time:'}
      </label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="time" id="inline-time-input" class="form-control" dir="ltr"
               value="${currentTime}" style="max-width:140px">
        <button class="btn btn-sm btn-primary" onclick="callcenterPage._saveScheduledTime('${orderId}')">
          ${ar ? 'حفظ الموعد' : 'Save Time'}
        </button>
        <button class="btn btn-sm btn-ghost" onclick="callcenterPage._saveScheduledTime('${orderId}', true)">
          ${ar ? 'حذف الموعد' : 'Clear'}
        </button>
      </div>`;

    // Insert after the scheduled_time detail row
    const detailGrid = document.querySelector('#order-detail-body .detail-grid');
    if (detailGrid) {
      const existing = document.getElementById('inline-time-editor-wrap');
      if (existing) existing.remove();
      const wrap = document.createElement('div');
      wrap.id = 'inline-time-editor-wrap';
      wrap.style.margin = '10px 0';
      wrap.appendChild(container);
      detailGrid.after(wrap);
      document.getElementById('inline-time-input')?.focus();
    }
  },

  async _saveScheduledTime(orderId, clear = false) {
    const val = clear ? null : (document.getElementById('inline-time-input')?.value || null);
    try {
      await api.orders.update(orderId, { scheduled_time: val });
      utils.toast(window.i18n.t('success'), 'success');
      // Remove editor and refresh detail
      document.getElementById('inline-time-editor-wrap')?.remove();
      await this.loadData();
      await this.openOrderDetail(orderId);
    } catch { utils.toast(window.i18n.t('error'), 'error'); }
  },

  // ── Update order status ───────────────────────────────
  async updateStatus(orderId, status) {
    const lang = window.i18n.current;
    const labels = {
      completed : lang === 'ar' ? '✅ تم إنهاء الأوردر بنجاح' : '✅ Order marked as completed',
      cancelled : lang === 'ar' ? 'تم إلغاء الأوردر'          : 'Order cancelled',
    };
    try {
      await api.orders.update(orderId, { status });
      utils.toast(labels[status] || window.i18n.t('success'), 'success');
      utils.hideModal('modal-order-detail');
      await this.loadData();
    } catch { utils.toast(window.i18n.t('error'), 'error'); }
  },
};

// ── Global clipboard helper ──────────────────────────────────
utils.copyToClipboard = function(text, btn) {
  navigator.clipboard?.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = window.i18n.t('linkCopied');
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.innerHTML;
    btn.textContent = window.i18n.t('linkCopied');
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
};
