// ============================================================
// public/js/pages/settings.js — Dashboard Settings
// WhatsApp message templates editor (Phase 3 addition)
// ============================================================

const settingsPage = {

  settings : null,   // loaded from server
  dirty    : false,  // unsaved changes flag

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  async render() {
    const lang = window.i18n.current;
    const ar   = lang === 'ar';

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div>
          <h1>${ar ? 'الإعدادات' : 'Settings'}</h1>
          <p class="page-subtitle">${ar ? 'تخصيص رسائل الواتساب وإعدادات النظام' : 'Customize WhatsApp messages & system settings'}</p>
        </div>
        <button class="btn btn-primary" id="settings-save-btn" onclick="settingsPage.save()" disabled>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${ar ? 'حفظ التغييرات' : 'Save Changes'}
        </button>
      </div>

      <!-- Loading state -->
      <div id="settings-body">
        <div class="loading-spinner"><div class="spinner"></div></div>
      </div>
    `;

    await this.loadSettings();
  },

  async loadSettings() {
    const lang = window.i18n.current;
    const ar   = lang === 'ar';
    try {
      this.settings = await api.settings.get();
      document.getElementById('settings-body').innerHTML = this.buildHTML(ar);
      this.dirty = false;
    } catch {
      document.getElementById('settings-body').innerHTML =
        `<div class="empty-card"><p>${window.i18n.t('error')}</p></div>`;
    }
  },

  buildHTML(ar) {
    const tmpl  = this.settings?.wa_templates || {};
    const hint  = ar
      ? 'استخدم <code>{link}</code> كمكان رابط التقييم داخل الرسالة'
      : 'Use <code>{link}</code> as the placeholder for the feedback link';

    const updated = this.settings?.updated_at
      ? (ar ? 'آخر حفظ: ' : 'Last saved: ') + new Date(this.settings.updated_at).toLocaleString(ar ? 'ar-EG' : 'en-GB')
      : '';

    return `
      <!-- Hint banner -->
      <div class="settings-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>${hint}</span>
        ${updated ? `<span class="settings-updated">${updated}</span>` : ''}
      </div>

      <!-- ── Arabic Templates ─────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-lang-badge ar-badge">🇸🇦 ${ar ? 'الرسائل بالعربي' : 'Arabic Messages'}</div>
        </div>

        <div class="settings-card">
          <div class="settings-field">
            <div class="settings-field-label">
              <span class="field-icon customer-badge-s">👤</span>
              <span>${ar ? 'رسالة العميل — تقييم العامل' : 'Customer Message — Rate Worker'}</span>
              <button class="btn btn-xs btn-ghost" onclick="settingsPage.preview('customer_ar')">
                ${ar ? 'معاينة' : 'Preview'}
              </button>
            </div>
            <textarea class="settings-textarea" id="tmpl-customer_ar"
                      oninput="settingsPage.markDirty()"
                      placeholder="${ar ? 'اكتب رسالتك هنا...' : 'Write your message here...'}">${this._esc(tmpl.customer_ar || '')}</textarea>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-field">
            <div class="settings-field-label">
              <span class="field-icon worker-badge-s">👷</span>
              <span>${ar ? 'رسالة العامل — تقييم العميل' : 'Worker Message — Rate Customer'}</span>
              <button class="btn btn-xs btn-ghost" onclick="settingsPage.preview('worker_ar')">
                ${ar ? 'معاينة' : 'Preview'}
              </button>
            </div>
            <textarea class="settings-textarea" id="tmpl-worker_ar"
                      oninput="settingsPage.markDirty()"
                      placeholder="${ar ? 'اكتب رسالتك هنا...' : 'Write your message here...'}">${this._esc(tmpl.worker_ar || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- ── English Templates ────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-lang-badge en-badge">🇬🇧 ${ar ? 'الرسائل بالإنجليزي' : 'English Messages'}</div>
        </div>

        <div class="settings-card">
          <div class="settings-field">
            <div class="settings-field-label">
              <span class="field-icon customer-badge-s">👤</span>
              <span>${ar ? 'رسالة العميل (English)' : 'Customer Message — Rate Worker'}</span>
              <button class="btn btn-xs btn-ghost" onclick="settingsPage.preview('customer_en')">
                ${ar ? 'معاينة' : 'Preview'}
              </button>
            </div>
            <textarea class="settings-textarea" id="tmpl-customer_en" dir="ltr"
                      oninput="settingsPage.markDirty()">${this._esc(tmpl.customer_en || '')}</textarea>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-field">
            <div class="settings-field-label">
              <span class="field-icon worker-badge-s">👷</span>
              <span>${ar ? 'رسالة العامل (English)' : 'Worker Message — Rate Customer'}</span>
              <button class="btn btn-xs btn-ghost" onclick="settingsPage.preview('worker_en')">
                ${ar ? 'معاينة' : 'Preview'}
              </button>
            </div>
            <textarea class="settings-textarea" id="tmpl-worker_en" dir="ltr"
                      oninput="settingsPage.markDirty()">${this._esc(tmpl.worker_en || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- ── Reset defaults ──────────────────────────── -->
      <div class="settings-section">
        <button class="btn btn-ghost btn-sm" onclick="settingsPage.resetDefaults()">
          🔄 ${ar ? 'إعادة تعيين الرسائل الافتراضية' : 'Reset to Default Messages'}
        </button>
      </div>

      <!-- ── Export & Backup ──────────────────────────── -->
      <div class="settings-section">
        <div class="settings-section-header">
          <div class="settings-lang-badge en-badge">
            💾 ${ar ? 'تصدير البيانات والنسخ الاحتياطية' : 'Export & Backup'}
          </div>
        </div>

        <div class="backup-section">
          <div class="backup-info">
            <h4>${ar ? 'نسخة احتياطية كاملة' : 'Full Backup'}</h4>
            <p>${ar ? 'تحميل كل البيانات (عملاء + عمالة + أوردرات + إعدادات) بصيغة JSON' : 'Download all data as a single JSON file'}</p>
          </div>
          <div class="backup-btns">
            <a href="/api/export/backup.json" class="btn btn-primary btn-sm" download>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              JSON ${ar ? 'كامل' : 'Backup'}
            </a>
          </div>
        </div>

        <div class="backup-section" style="margin-top:10px">
          <div class="backup-info">
            <h4>${ar ? 'تصدير CSV' : 'Export CSV'}</h4>
            <p>${ar ? 'تصدير البيانات بصيغة CSV لفتحها في Excel أو Google Sheets' : 'Export as CSV for Excel or Google Sheets'}</p>
          </div>
          <div class="backup-btns">
            <a href="/api/export/orders.csv" class="btn btn-ghost btn-sm" download>
              📋 ${ar ? 'الأوردرات' : 'Orders'}
            </a>
            <a href="/api/export/customers.csv" class="btn btn-ghost btn-sm" download>
              👤 ${ar ? 'العملاء' : 'Customers'}
            </a>
            <a href="/api/export/workers.csv" class="btn btn-ghost btn-sm" download>
              👷 ${ar ? 'العمالة' : 'Workers'}
            </a>
            <a href="/api/export/orders.csv?today=1" class="btn btn-ghost btn-sm" download>
              📅 ${ar ? 'أوردرات اليوم' : "Today's Orders"}
            </a>
          </div>
        </div>
      </div>

      <!-- ── Preview Modal ────────────────────────────── -->
      <div class="modal-overlay" id="modal-template-preview">
        <div class="modal">
          <div class="modal-header">
            <h2>${ar ? 'معاينة الرسالة' : 'Message Preview'}</h2>
            <button class="modal-close" onclick="utils.hideModal('modal-template-preview')">✕</button>
          </div>
          <div class="modal-body">
            <p class="preview-note">${ar ? 'هكذا ستظهر الرسالة على الواتساب:' : 'This is how the message will appear on WhatsApp:'}</p>
            <div class="wa-preview-bubble" id="preview-bubble"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="utils.hideModal('modal-template-preview')">
              ${ar ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Helpers ───────────────────────────────────────────────
  _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  markDirty() {
    this.dirty = true;
    const btn = document.getElementById('settings-save-btn');
    if (btn) {
      btn.disabled = false;
      btn.classList.add('btn-dirty');
    }
  },

  // ── Preview a template ────────────────────────────────────
  preview(key) {
    const ta  = document.getElementById(`tmpl-${key}`);
    if (!ta) return;
    const msg     = ta.value;
    const sample  = `${window.location.origin}/feedback.html?order=DEMO123&type=customer`;
    const final   = msg.replace('{link}', sample);
    const bubble  = document.getElementById('preview-bubble');
    if (bubble) bubble.innerHTML = final.replace(/\n/g, '<br>');
    utils.showModal('modal-template-preview');
  },

  // ── Save ─────────────────────────────────────────────────
  async save() {
    const ar  = window.i18n.current === 'ar';
    const btn = document.getElementById('settings-save-btn');
    btn.disabled = true;

    const keys  = ['customer_ar', 'customer_en', 'worker_ar', 'worker_en'];
    const templates = {};
    keys.forEach(k => {
      const el = document.getElementById(`tmpl-${k}`);
      if (el) templates[k] = el.value;
    });

    // Validate: each template must contain {link}
    const missing = keys.filter(k => templates[k] && !templates[k].includes('{link}'));
    if (missing.length) {
      utils.toast(
        ar ? `يجب أن تحتوي الرسائل على {link}: ${missing.join(', ')}` : `Templates must include {link}: ${missing.join(', ')}`,
        'error', 4000
      );
      btn.disabled = false;
      return;
    }

    try {
      const result = await api.settings.update({ wa_templates: templates });
      this.settings = result.settings;
      this.dirty    = false;
      btn.classList.remove('btn-dirty');
      btn.disabled  = true;
      utils.toast(ar ? '✅ تم حفظ الرسائل بنجاح' : '✅ Templates saved successfully', 'success');

      // Update the last-saved timestamp in the hint
      const updated = ar
        ? 'آخر حفظ: ' + new Date().toLocaleString('ar-EG')
        : 'Last saved: ' + new Date().toLocaleString('en-GB');
      const updEl = document.querySelector('.settings-updated');
      if (updEl) updEl.textContent = updated;
    } catch {
      utils.toast(window.i18n.t('error'), 'error');
      btn.disabled = false;
    }
  },

  // ── Reset defaults ────────────────────────────────────────
  async resetDefaults() {
    const ar   = window.i18n.current === 'ar';
    const conf = ar ? 'هل تريد إعادة تعيين جميع الرسائل للنص الافتراضي؟' : 'Reset all templates to defaults?';
    if (!window.confirm(conf)) return;

    const defaults = {
      customer_ar: '🌟 شكراً لاختيارك خدمتنا!\nيسعدنا سماع رأيك — يرجى تقييم جودة الخدمة التي حصلت عليها من خلال الرابط:\n{link}\n\nشكراً 🙏',
      customer_en: '🌟 Thank you for choosing our service!\nWe would love your feedback — please rate the service you received:\n{link}\n\nThank you 🙏',
      worker_ar  : '🌟 شكراً على عملك الرائع!\nيرجى تقييم العميل الذي خدمته اليوم من خلال الرابط:\n{link}\n\nشكراً 🙏',
      worker_en  : '🌟 Thank you for your great work!\nPlease rate the customer you served today:\n{link}\n\nThank you 🙏',
    };

    Object.entries(defaults).forEach(([k, v]) => {
      const el = document.getElementById(`tmpl-${k}`);
      if (el) el.value = v;
    });
    this.markDirty();
  },
};
