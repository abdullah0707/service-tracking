// ============================================================
// public/js/pages/dashboard.js — Today's Agenda + Analytics
// Rewritten clean — Phase 4 final
// ============================================================

const dashboardPage = {

  // ── State ────────────────────────────────────────────────
  _refreshTimer : null,
  _lastOrders   : [],

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  async render() {
    const t    = (k) => window.i18n.t(k);
    const lang = window.i18n.current;
    const ar   = lang === 'ar';

    this._stopAutoRefresh();

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1 data-i18n="todayAgenda">${t('todayAgenda')}</h1>
          <p class="page-subtitle" id="dash-last-updated">${utils.formatDate(utils.today())}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="dashboardPage.printReport()" title="${ar?'طباعة تقرير اليوم':'Print Daily Report'}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            ${ar?'طباعة':'Print'}
          </button>
          <a href="/api/export/orders.csv?today=1" class="btn btn-ghost btn-sm" download title="CSV">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </a>
          <button class="btn btn-primary btn-sm" onclick="dashboardPage.refresh()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            ${ar?'تحديث':'Refresh'}
          </button>
        </div>
      </div>

      <!-- Time alerts banner -->
      <div id="time-alerts-banner"></div>

      <!-- Summary cards -->
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card skeleton"></div>
        <div class="stat-card skeleton"></div>
        <div class="stat-card skeleton"></div>
        <div class="stat-card skeleton"></div>
      </div>

      <!-- Financial Report -->
      <div class="section-title">
        <span data-i18n="financialReport">${t('financialReport')}</span>
      </div>
      <div class="finance-grid" id="finance-grid">
        <div class="finance-card skeleton" style="height:90px"></div>
        <div class="finance-card skeleton" style="height:90px"></div>
        <div class="finance-card skeleton" style="height:90px"></div>
      </div>

      <!-- Charts row -->
      <div class="charts-row">
        <div class="card chart-card">
          <h3 class="card-title" data-i18n="topAreas">${t('topAreas')}</h3>
          <div id="areas-chart"></div>
        </div>
        <div class="card chart-card">
          <h3 class="card-title" data-i18n="serviceBreakdown">${t('serviceBreakdown')}</h3>
          <div id="service-chart"></div>
        </div>
      </div>

      <!-- Today orders list -->
      <div class="section-title">
        <span data-i18n="ordersToday">${t('ordersToday')}</span>
        <button class="btn btn-sm btn-ghost" onclick="app.navigate('callcenter')">
          + ${t('newOrder')}
        </button>
      </div>
      <div id="today-orders">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    `;

    await this.loadData();
    this._startAutoRefresh();
  },

  // ════════════════════════════════════════════════════════
  // AUTO-REFRESH
  // ════════════════════════════════════════════════════════
  _startAutoRefresh() {
    this._refreshTimer = setInterval(() => {
      if (app.currentPage === 'dashboard') this.loadData();
    }, 60000);
  },

  _stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  },

  _updateLastUpdated() {
    const el = document.getElementById('dash-last-updated');
    if (!el) return;
    const lang = window.i18n.current;
    const time = new Date().toLocaleTimeString(
      lang === 'ar' ? 'ar-EG' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );
    el.textContent = `${utils.formatDate(utils.today())} · ${lang==='ar'?'آخر تحديث':'Updated'} ${time}`;
  },

  // ════════════════════════════════════════════════════════
  // LOAD DATA
  // ════════════════════════════════════════════════════════
  async refresh() { await this.loadData(); },

  async loadData() {
    try {
      const [analytics, orders, alerts] = await Promise.all([
        api.analytics.get(),
        api.orders.today(),
        api.timeAlerts.get().catch(() => []),
      ]);
      this._lastOrders = orders;
      this.renderTimeAlerts(alerts);
      this.renderStats(analytics);
      this.renderFinance(analytics);
      this.renderAreasChart(analytics.areas);
      this.renderServiceChart(analytics.service_types);
      this.renderOrdersList(orders);
      this._updateLastUpdated();
    } catch {
      utils.toast(window.i18n.t('error'), 'error');
    }
  },

  // ════════════════════════════════════════════════════════
  // TIME ALERTS BANNER
  // ════════════════════════════════════════════════════════
  renderTimeAlerts(alerts) {
    const el = document.getElementById('time-alerts-banner');
    if (!el) return;
    if (!alerts || !alerts.length) { el.innerHTML = ''; return; }

    const lang = window.i18n.current;
    const ar   = lang === 'ar';
    const late     = alerts.filter(a => a.time_status === 'late');
    const dueNow   = alerts.filter(a => a.time_status === 'due_now');
    const upcoming = alerts.filter(a => a.time_status === 'upcoming');
    const rows = [];

    if (late.length) rows.push(`
      <div class="alert-time-row alert-time-late">
        <span class="alert-time-icon">⏰</span>
        <div class="alert-time-body">
          <strong>${ar?`${late.length} أوردر متأخر`:`${late.length} Late Order${late.length>1?'s':''}`}</strong>
          <span>${late.map(a=>`${a.customer_name} (${utils.formatTime(a.scheduled_time)})`).join(' · ')}</span>
        </div>
        <button class="btn btn-xs btn-danger" onclick="app.navigate('callcenter')">${ar?'معالجة':'Handle'}</button>
      </div>`);

    if (dueNow.length) rows.push(`
      <div class="alert-time-row alert-time-due">
        <span class="alert-time-icon">🔔</span>
        <div class="alert-time-body">
          <strong>${ar?`${dueNow.length} أوردر حان وقته`:`${dueNow.length} Order${dueNow.length>1?'s':''} Due Now`}</strong>
          <span>${dueNow.map(a=>`${a.customer_name} (${utils.formatTime(a.scheduled_time)})`).join(' · ')}</span>
        </div>
        <button class="btn btn-xs btn-outline" onclick="app.navigate('callcenter')">${ar?'عرض':'View'}</button>
      </div>`);

    if (upcoming.length) rows.push(`
      <div class="alert-time-row alert-time-upcoming">
        <span class="alert-time-icon">📅</span>
        <div class="alert-time-body">
          <strong>${ar?`${upcoming.length} أوردر قادم`:`${upcoming.length} Upcoming Order${upcoming.length>1?'s':''}`}</strong>
          <span>${upcoming.map(a=>`${a.customer_name} (${utils.formatTime(a.scheduled_time)})`).join(' · ')}</span>
        </div>
      </div>`);

    el.innerHTML = `<div class="time-alerts-wrap">${rows.join('')}</div>`;
  },

  // ════════════════════════════════════════════════════════
  // STATS CARDS
  // ════════════════════════════════════════════════════════
  renderStats(analytics) {
    const t = (k) => window.i18n.t(k);
    const s = analytics.today_summary;
    const icons = { pending:'🕐', dispatched:'🚀', completed:'✅', cancelled:'❌' };

    document.getElementById('stats-grid').innerHTML =
      ['pending','dispatched','completed','cancelled'].map(key => `
        <div class="stat-card stat-${key}">
          <div class="stat-icon">${icons[key]}</div>
          <div class="stat-info">
            <span class="stat-number">${s[key]||0}</span>
            <span class="stat-label">${t(key)}</span>
          </div>
        </div>`).join('') +
      `<div class="stat-card stat-total">
        <div class="stat-icon">📋</div>
        <div class="stat-info">
          <span class="stat-number">${s.total||0}</span>
          <span class="stat-label">${t('ordersToday')}</span>
        </div>
      </div>`;
  },

  // ════════════════════════════════════════════════════════
  // FINANCE
  // ════════════════════════════════════════════════════════
  renderFinance(analytics) {
    const t = (k) => window.i18n.t(k);
    const r = analytics.revenue;
    document.getElementById('finance-grid').innerHTML = `
      <div class="finance-card">
        <span class="finance-label">${t('dailyRevenue')}</span>
        <span class="finance-amount">${utils.currency(r.daily)}</span>
      </div>
      <div class="finance-card highlight">
        <span class="finance-label">${t('weeklyRevenue')}</span>
        <span class="finance-amount">${utils.currency(r.weekly)}</span>
      </div>
      <div class="finance-card">
        <span class="finance-label">${t('monthlyRevenue')}</span>
        <span class="finance-amount">${utils.currency(r.monthly)}</span>
      </div>`;
  },

  // ════════════════════════════════════════════════════════
  // CHARTS
  // ════════════════════════════════════════════════════════
  renderAreasChart(areas) {
    const el = document.getElementById('areas-chart');
    if (!areas || !areas.length) {
      el.innerHTML = `<p class="empty-state">${window.i18n.t('noOrdersToday')}</p>`; return;
    }
    const max = areas[0]?.count || 1;
    el.innerHTML = `<div class="bar-chart">
      ${areas.slice(0,6).map((a,i) => `
        <div class="bar-row">
          <span class="bar-label">${utils.esc(a.area)}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.round((a.count/max)*100)}%;animation-delay:${i*0.08}s"></div>
          </div>
          <span class="bar-value">${a.count}</span>
        </div>`).join('')}
    </div>`;
  },

  renderServiceChart(st) {
    const t  = (k) => window.i18n.t(k);
    const el = document.getElementById('service-chart');
    if (!st || st.total === 0) {
      el.innerHTML = `<p class="empty-state">${t('noOrdersToday')}</p>`; return;
    }
    el.innerHTML = `
      <div class="donut-wrap">
        <div class="donut-chart">
          <svg viewBox="0 0 36 36" class="donut-svg">
            <circle class="donut-bg" cx="18" cy="18" r="15.9"/>
            <circle class="donut-seg donut-regular" cx="18" cy="18" r="15.9"
              stroke-dasharray="${st.regular_pct} ${100-st.regular_pct}"
              stroke-dashoffset="25"/>
            <circle class="donut-seg donut-deep" cx="18" cy="18" r="15.9"
              stroke-dasharray="${st.deep_pct} ${100-st.deep_pct}"
              stroke-dashoffset="${25-st.regular_pct}"/>
          </svg>
          <div class="donut-center">
            <span class="donut-total">${st.total}</span>
            <span class="donut-sub">${t('order')}</span>
          </div>
        </div>
        <div class="donut-legend">
          <div class="legend-item"><span class="legend-dot regular"></span><span>${t('regular')} (${st.regular_pct}%)</span></div>
          <div class="legend-item"><span class="legend-dot deep"></span><span>${t('deep')} (${st.deep_pct}%)</span></div>
        </div>
      </div>`;
  },

  // ════════════════════════════════════════════════════════
  // ORDERS LIST
  // ════════════════════════════════════════════════════════
  renderOrdersList(orders) {
    const t  = (k) => window.i18n.t(k);
    const el = document.getElementById('today-orders');
    if (!orders || !orders.length) {
      el.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">📋</div>
          <p>${t('noOrdersToday')}</p>
          <button class="btn btn-primary" onclick="app.navigate('callcenter')">+ ${t('newOrder')}</button>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="orders-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>#</th>
            <th>${t('customerName')}</th>
            <th class="col-hide-sm">${t('area')}</th>
            <th>${t('serviceType')}</th>
            <th class="col-hide-sm">${t('cost')}</th>
            <th>${t('status')}</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${orders.map((o,i) => `
              <tr class="tr-${o.status}">
                <td class="order-num">${i+1}</td>
                <td>
                  <strong>${utils.esc(o.customer_name||'—')}</strong>
                  ${o.scheduled_time ? `<br><small>${utils.timeStatusBadge(o.time_status, o.scheduled_time)}</small>` : ''}
                </td>
                <td class="col-hide-sm">${utils.esc(o.area)}</td>
                <td>${utils.statusBadge(o.service_type)}</td>
                <td class="amount col-hide-sm">${utils.currency(o.cost)}</td>
                <td>${utils.statusBadge(o.status)}</td>
                <td>
                  <button class="btn btn-xs btn-ghost" onclick="callcenterPage.openOrderDetail('${o.id}')">
                    ${t('view')}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // ════════════════════════════════════════════════════════
  // EXPORT & PRINT
  // ════════════════════════════════════════════════════════
  exportToday() { window.open('/api/export/orders.csv?today=1', '_blank'); },

  printReport() {
    const lang   = window.i18n.current;
    const ar     = lang === 'ar';
    const orders = this._lastOrders || [];
    const date   = utils.formatDate(utils.today());
    const total  = orders.reduce((s,o) => s + (o.cost||0), 0);
    const stLbl  = { pending:'قيد الانتظار', dispatched:'جاري', completed:'مكتمل', cancelled:'ملغي' };

    const rows = orders.map((o,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${o.customer_name||'—'}</td>
        <td dir="ltr">${o.scheduled_time ? utils.formatTime(o.scheduled_time) : '—'}</td>
        <td>${o.area}</td>
        <td>${o.worker_name||'—'}</td>
        <td>${ar?(o.service_type==='regular'?'عادي':'عميق'):o.service_type}</td>
        <td>${o.cost} ${ar?'ج.م':'EGP'}</td>
        <td>${ar?(stLbl[o.status]||o.status):o.status}</td>
      </tr>`).join('');

    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html dir="${ar?'rtl':'ltr'}" lang="${lang}">
<head><meta charset="UTF-8"><title>${ar?'تقرير اليوم':'Daily Report'} — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${ar?"'IBM Plex Sans Arabic'":"'Inter'"},sans-serif;padding:28px;color:#1a1f36;font-size:13px;direction:${ar?'rtl':'ltr'}}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1a1f36}
  .logo{font-size:20px;font-weight:700}.logo span{background:#4f63d2;color:#fff;padding:2px 10px;border-radius:6px;margin-inline-end:8px}
  .sub{font-size:12px;color:#6b7896;margin-top:4px}
  .stats{display:flex;gap:12px;margin-bottom:20px}
  .st{background:#f0f2f7;border-radius:8px;padding:12px 16px;flex:1;text-align:center}
  .st-n{font-size:20px;font-weight:700}.st-l{font-size:11px;color:#6b7896;margin-top:3px}
  table{width:100%;border-collapse:collapse}
  th{background:#f0f2f7;padding:9px 12px;text-align:${ar?'right':'left'};font-size:11px;font-weight:700;color:#6b7896;border-bottom:2px solid #e4e8f5}
  td{padding:9px 12px;border-bottom:1px solid #e4e8f5}
  tr:nth-child(even){background:#f9fafb}
  .tot td{background:#eef0fb;font-weight:700;border-top:2px solid #4f63d2}
  .ftr{margin-top:24px;padding-top:12px;border-top:1px solid #e4e8f5;font-size:11px;color:#9aa3c2;display:flex;justify-content:space-between}
  @media print{.no-print{display:none}}
</style></head>
<body>
<div class="hdr">
  <div><div class="logo"><span>ST</span> Service Tracking</div><div class="sub">${ar?'تقرير يومي':'Daily Report'} — ${date}</div></div>
  <button class="no-print" onclick="window.print()" style="padding:8px 16px;background:#4f63d2;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ ${ar?'طباعة':'Print'}</button>
</div>
<div class="stats">
  <div class="st"><div class="st-n">${orders.length}</div><div class="st-l">${ar?'إجمالي':'Total'}</div></div>
  <div class="st"><div class="st-n">${orders.filter(o=>o.status==='completed').length}</div><div class="st-l">${ar?'مكتملة':'Completed'}</div></div>
  <div class="st"><div class="st-n">${orders.filter(o=>o.status==='pending').length}</div><div class="st-l">${ar?'انتظار':'Pending'}</div></div>
  <div class="st"><div class="st-n">${orders.filter(o=>o.status==='dispatched').length}</div><div class="st-l">${ar?'جاري':'Active'}</div></div>
  <div class="st"><div class="st-n">${total.toLocaleString(ar?'ar-EG':'en-US')} ${ar?'ج.م':'EGP'}</div><div class="st-l">${ar?'الإيرادات':'Revenue'}</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>${ar?'العميل':'Customer'}</th><th>${ar?'الموعد':'Time'}</th>
    <th>${ar?'المنطقة':'Area'}</th><th>${ar?'العامل':'Worker'}</th>
    <th>${ar?'النوع':'Type'}</th><th>${ar?'التكلفة':'Cost'}</th><th>${ar?'الحالة':'Status'}</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="tot"><td colspan="6">${ar?'الإجمالي':'Total'}</td><td>${total.toLocaleString(ar?'ar-EG':'en-US')} ${ar?'ج.م':'EGP'}</td><td></td></tr>
  </tbody>
</table>
<div class="ftr"><span>Service Tracking</span><span>${ar?'طُبع:':'Printed:'} ${new Date().toLocaleString(ar?'ar-EG':'en-GB')}</span></div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  },
};
