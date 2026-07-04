// ============================================================
// server.js — Service Tracking Dashboard Backend
// Express + JSON-file storage (MVP architecture)
// Phase 4 + Auth: Session-based authentication
// ============================================================

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Data file paths ──────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const PATHS = {
  customers : path.join(DATA_DIR, 'customers.json'),
  workers   : path.join(DATA_DIR, 'workers.json'),
  orders    : path.join(DATA_DIR, 'orders.json'),
  settings  : path.join(DATA_DIR, 'settings.json'),
  users     : path.join(DATA_DIR, 'users.json'),
};

// ── Write queue — prevents file corruption under concurrent load
const _writeQueues = {};
function writeJSON(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Helpers: atomic read ─────────────────────────────────────
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════
// AUTH SYSTEM
// ════════════════════════════════════════════════════════════

// ── In-memory session store (survives restarts via token check) ──
// Map: token → { userId, username, displayName, role, expiresAt }
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── Password helpers ──────────────────────────────────────────
function hashPassword(password, salt) {
  return crypto
    .createHmac('sha256', salt)
    .update(password)
    .digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Session helpers ───────────────────────────────────────────
function createSession(user) {
  const token = generateToken();
  sessions.set(token, {
    userId     : user.id,
    username   : user.username,
    displayName: user.display_name,
    role       : user.role,
    expiresAt  : Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  // Sliding window: refresh expiry on activity
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

// ── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
  req.session = session;
  next();
}

// Apply auth to ALL /api/* routes EXCEPT:
//   /api/auth/*        (login, logout, me — handle auth themselves)
//   /api/feedback/*    (public links sent to customers/workers)
app.use('/api', (req, res, next) => {
  const p = req.path;
  if (p.startsWith('/auth/') || p.startsWith('/feedback/')) return next();
  requireAuth(req, res, next);
});

// ── Server-side validation helpers ───────────────────────────
const validate = {
  phone(v)       { return /^0[0-9]{9,10}$/.test(String(v||'').trim()); },
  nationalId(v)  { return !v || /^[0-9]{14}$/.test(String(v||'').trim()); },
  required(v)    { return String(v||'').trim().length > 0; },
  cost(v)        { return !isNaN(Number(v)) && Number(v) >= 0; },
  time(v)        { return !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)); },
  date(v)        { return !v || /^\d{4}-\d{2}-\d{2}$/.test(String(v)); },
  serviceType(v) { return ['regular','deep'].includes(v); },
  status(v)      { return ['pending','dispatched','completed','cancelled'].includes(v); },
  wStatus(v)     { return ['available','busy','off'].includes(v); },
};

function validationError(res, errors) {
  return res.status(422).json({ error: 'Validation failed', details: errors });
}

/**
 * Recalculate average_rating for a customer or worker
 * based on their orders history.
 */
function recalcRating(entity, orders, entityType) {
  // entityType: 'customer' | 'worker'
  const feedbackField = entityType === 'customer' ? 'customer_feedback' : 'worker_feedback';
  const entityField   = entityType === 'customer' ? 'customer_id'       : 'worker_id';

  const relevant = orders.filter(
    o => o[entityField] === entity.id && o[feedbackField] && o[feedbackField].rating
  );

  if (relevant.length === 0) {
    entity.average_rating = null;
    return;
  }
  const sum = relevant.reduce((acc, o) => acc + Number(o[feedbackField].rating), 0);
  entity.average_rating = Math.round((sum / relevant.length) * 10) / 10;
}

/**
 * Calculate time_status for an order based on scheduled_time.
 * Returns: 'late' | 'due_now' | 'upcoming' | 'none'
 *
 * Logic (only for active statuses pending/dispatched):
 *   late     → scheduled time passed by > 15 minutes
 *   due_now  → within ±15 minutes of scheduled time
 *   upcoming → more than 15 minutes in the future
 *   none     → no scheduled_time set, or order is completed/cancelled
 */
function calcTimeStatus(order) {
  if (!order.scheduled_time) return 'none';
  if (['completed', 'cancelled'].includes(order.status)) return 'none';

  const now  = Date.now();
  const scheduled = new Date(`${order.date}T${order.scheduled_time}`).getTime();
  if (isNaN(scheduled)) return 'none';

  const diffMin = (scheduled - now) / 60000; // positive = future

  if (diffMin < -15)  return 'late';
  if (diffMin <= 15)  return 'due_now';
  return 'upcoming';
}

/** Attach time_status to an order object (non-mutating) */
function enrichOrder(o) {
  return { ...o, time_status: calcTimeStatus(o) };
}

// ── Seed data check ──────────────────────────────────────────
function ensureSeedData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(PATHS.customers)) {
    writeJSON(PATHS.customers, [
      { id: 'c1', name: 'أحمد محمد السيد',     phone: '0501234567', area: 'مدينة نصر',   address: 'شارع عباس العقاد، ع٥، ش١٢', average_rating: null, orders_history: [] },
      { id: 'c2', name: 'سارة خالد إبراهيم',   phone: '0559876543', area: 'المهندسين',   address: 'شارع جامعة الدول، ع٨، ش٣',   average_rating: 4.5, orders_history: [] },
      { id: 'c3', name: 'محمد علي حسن',         phone: '0512345678', area: 'التجمع الخامس', address: 'كمبوند ميفيدا، ع١٢، ش٧', average_rating: 2.5, orders_history: [] },
    ]);
  }

  if (!fs.existsSync(PATHS.workers)) {
    writeJSON(PATHS.workers, [
      { id: 'w1', name: 'فاطمة عبد الرحمن',  phone: '0521111111', area: 'مدينة نصر',     address: 'شارع الحجاز، ع٣',  national_id: '29501010100001', status: 'available', average_rating: 4.8, orders_history: [] },
      { id: 'w2', name: 'منى إبراهيم سعد',   phone: '0532222222', area: 'المهندسين',     address: 'شارع سودان، ع١',   national_id: '29801010100002', status: 'busy',      average_rating: 3.9, orders_history: [] },
      { id: 'w3', name: 'هبة محمود طاهر',    phone: '0543333333', area: 'التجمع الخامس', address: 'القاهرة الجديدة',  national_id: '29901010100003', status: 'available', average_rating: 4.2, orders_history: [] },
      { id: 'w4', name: 'نهى كمال عبد الله', phone: '0554444444', area: 'المهندسين',     address: 'شارع لبنان، ع٤',   national_id: '30001010100004', status: 'off',       average_rating: 2.8, orders_history: [] },
    ]);
  }

  if (!fs.existsSync(PATHS.orders)) {
    const today = new Date().toISOString().split('T')[0];
    // Generate sample times relative to now for demo purposes
    const nowH  = new Date().getHours();
    const pastT  = `${String(Math.max(nowH - 2, 8)).padStart(2,'0')}:00`;
    const lateT  = `${String(Math.max(nowH - 1, 8)).padStart(2,'0')}:30`;
    const nowT   = `${String(nowH).padStart(2,'0')}:15`;
    const futureT= `${String(Math.min(nowH + 2, 20)).padStart(2,'0')}:00`;
    writeJSON(PATHS.orders, [
      { id: 'o1', customer_id: 'c1', worker_id: 'w1', area: 'مدينة نصر',     address: 'شارع عباس العقاد، ع٥', apartment_size: 120, service_type: 'regular', cost: 250, status: 'completed',  date: today, scheduled_time: pastT,   customer_feedback: { rating: 5, notes: 'ممتازة وسريعة' }, worker_feedback: { rating: 4, notes: 'عميل محترم' } },
      { id: 'o2', customer_id: 'c2', worker_id: 'w2', area: 'المهندسين',     address: 'شارع جامعة الدول',      apartment_size: 200, service_type: 'deep',    cost: 500, status: 'dispatched', date: today, scheduled_time: lateT,   customer_feedback: null, worker_feedback: null },
      { id: 'o3', customer_id: 'c3', worker_id: null,  area: 'التجمع الخامس', address: 'كمبوند ميفيدا',        apartment_size: 150, service_type: 'regular', cost: 300, status: 'pending',    date: today, scheduled_time: nowT,    customer_feedback: null, worker_feedback: null },
      { id: 'o4', customer_id: 'c1', worker_id: null,  area: 'مدينة نصر',     address: 'شارع النزهة، ع٢',      apartment_size: 90,  service_type: 'regular', cost: 200, status: 'pending',    date: today, scheduled_time: futureT, customer_feedback: null, worker_feedback: null },
    ]);
  }

  if (!fs.existsSync(PATHS.settings)) {
    writeJSON(PATHS.settings, {
      wa_templates: {
        customer_ar: '🌟 شكراً لاختيارك خدمتنا!\nيسعدنا سماع رأيك — يرجى تقييم جودة الخدمة التي حصلت عليها من خلال الرابط:\n{link}\n\nشكراً 🙏',
        customer_en: '🌟 Thank you for choosing our service!\nWe would love your feedback — please rate the service you received:\n{link}\n\nThank you 🙏',
        worker_ar  : '🌟 شكراً على عملك الرائع!\nيرجى تقييم العميل الذي خدمته اليوم من خلال الرابط:\n{link}\n\nشكراً 🙏',
        worker_en  : '🌟 Thank you for your great work!\nPlease rate the customer you served today:\n{link}\n\nThank you 🙏',
      },
      updated_at: new Date().toISOString(),
    });
  }

  if (!fs.existsSync(PATHS.users)) {
    const adminSalt = generateSalt();
    const ccSalt    = generateSalt();
    writeJSON(PATHS.users, [
      {
        id           : 'u1',
        username     : 'admin',
        display_name : 'مدير النظام',
        role         : 'admin',
        salt         : adminSalt,
        password_hash: hashPassword('admin123', adminSalt),
        created_at   : new Date().toISOString(),
        must_change_password: true,
      },
      {
        id           : 'u2',
        username     : 'callcenter',
        display_name : 'موظف الكول سنتر',
        role         : 'callcenter',
        salt         : ccSalt,
        password_hash: hashPassword('cc1234', ccSalt),
        created_at   : new Date().toISOString(),
        must_change_password: false,
      },
    ]);
  }
}

ensureSeedData();
// ════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJSON(PATHS.users);
  const user  = users.find(u => u.username === String(username).trim().toLowerCase());

  if (!user) {
    // Constant-time-ish response to avoid username enumeration
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const hash = hashPassword(String(password), user.salt);
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createSession(user);

  // Update last_login
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx].last_login = new Date().toISOString();
    writeJSON(PATHS.users, users);
  }

  res.json({
    token,
    user: {
      id          : user.id,
      username    : user.username,
      display_name: user.display_name,
      role        : user.role,
      must_change_password: user.must_change_password || false,
    },
    expires_in: SESSION_TTL_MS,
  });
});

// GET /api/auth/me — verify token and return user info
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session });
});

// POST /api/auth/logout — invalidate session token
app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// PUT /api/auth/change-password — authenticated users can change their own password
app.put('/api/auth/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  if (String(new_password).length < 6) {
    return res.status(422).json({ error: 'New password must be at least 6 characters' });
  }

  const users = readJSON(PATHS.users);
  const idx   = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  // Verify current password
  const currentHash = hashPassword(String(current_password), users[idx].salt);
  if (currentHash !== users[idx].password_hash) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Update password
  const newSalt = generateSalt();
  users[idx].salt          = newSalt;
  users[idx].password_hash = hashPassword(String(new_password), newSalt);
  users[idx].must_change_password = false;
  users[idx].updated_at    = new Date().toISOString();

  writeJSON(PATHS.users, users);
  res.json({ success: true });
});

// GET /api/auth/users — admin only: list users (without sensitive fields)
app.get('/api/auth/users', requireAuth, (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const users = readJSON(PATHS.users);
  res.json(users.map(u => ({
    id          : u.id,
    username    : u.username,
    display_name: u.display_name,
    role        : u.role,
    last_login  : u.last_login || null,
    created_at  : u.created_at,
    must_change_password: u.must_change_password || false,
  })));
});

// POST /api/auth/users — admin only: create user
app.post('/api/auth/users', requireAuth, (req, res) => {
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { username, password, display_name, role } = req.body || {};
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'username, password, display_name required' });
  }
  if (password.length < 6) return res.status(422).json({ error: 'Password min 6 chars' });
  if (!['admin','callcenter'].includes(role)) return res.status(422).json({ error: 'Invalid role' });

  const users = readJSON(PATHS.users);
  if (users.find(u => u.username === username.toLowerCase())) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const salt = generateSalt();
  const newUser = {
    id           : uuidv4(),
    username     : username.toLowerCase().trim(),
    display_name : display_name.trim(),
    role,
    salt,
    password_hash: hashPassword(password, salt),
    created_at   : new Date().toISOString(),
    must_change_password: true,
  };
  users.push(newUser);
  writeJSON(PATHS.users, users);

  const { salt: _, password_hash: __, ...safe } = newUser;
  res.status(201).json(safe);
});

// DELETE /api/auth/users/:id — admin only, cannot delete self
app.delete('/api/auth/users/:id', requireAuth, (req, res) => {
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (req.params.id === req.session.userId) return res.status(400).json({ error: 'Cannot delete yourself' });

  let users = readJSON(PATHS.users);
  if (!users.find(u => u.id === req.params.id)) return res.status(404).json({ error: 'User not found' });

  users = users.filter(u => u.id !== req.params.id);
  writeJSON(PATHS.users, users);
  res.json({ success: true });
});

ensureSeedData();

// ════════════════════════════════════════════════════════════
// CUSTOMERS API
// ════════════════════════════════════════════════════════════

// GET /api/customers — list all customers
app.get('/api/customers', (req, res) => {
  const customers = readJSON(PATHS.customers);
  const orders    = readJSON(PATHS.orders);

  // Enrich with order count
  const enriched = customers.map(c => {
    const custOrders = orders.filter(o => o.customer_id === c.id);
    return { ...c, total_orders: custOrders.length, orders_history: custOrders };
  });
  res.json(enriched);
});

// GET /api/customers/:id — single customer with orders
app.get('/api/customers/:id', (req, res) => {
  const customers = readJSON(PATHS.customers);
  const orders    = readJSON(PATHS.orders);
  const c = customers.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  const custOrders = orders.filter(o => o.customer_id === c.id);
  res.json({ ...c, orders_history: custOrders });
});

// POST /api/customers — create
app.post('/api/customers', (req, res) => {
  const errs = [];
  if (!validate.required(req.body.name))  errs.push('name is required');
  if (!validate.required(req.body.phone)) errs.push('phone is required');
  if (!validate.phone(req.body.phone))    errs.push('phone must be 10-11 digits starting with 0');
  if (errs.length) return validationError(res, errs);

  const customers = readJSON(PATHS.customers);
  const newCustomer = {
    id: uuidv4(),
    name: String(req.body.name).trim(),
    phone: String(req.body.phone).trim(),
    area: String(req.body.area || '').trim(),
    address: String(req.body.address || '').trim(),
    average_rating: null,
    orders_history: [],
    created_at: new Date().toISOString(),
  };
  customers.push(newCustomer);
  writeJSON(PATHS.customers, customers);
  res.status(201).json(newCustomer);
});

// PUT /api/customers/:id — update
app.put('/api/customers/:id', (req, res) => {
  const customers = readJSON(PATHS.customers);
  const idx = customers.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });

  const allowed = ['name', 'phone', 'area', 'address'];
  allowed.forEach(f => { if (req.body[f] !== undefined) customers[idx][f] = req.body[f]; });
  customers[idx].updated_at = new Date().toISOString();

  writeJSON(PATHS.customers, customers);
  res.json(customers[idx]);
});

// DELETE /api/customers/:id
app.delete('/api/customers/:id', (req, res) => {
  let customers = readJSON(PATHS.customers);
  const exists = customers.find(x => x.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Customer not found' });
  customers = customers.filter(x => x.id !== req.params.id);
  writeJSON(PATHS.customers, customers);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
// WORKERS API
// ════════════════════════════════════════════════════════════

// GET /api/workers — list all (optional ?area=X&status=available)
app.get('/api/workers', (req, res) => {
  const workers = readJSON(PATHS.workers);
  const orders  = readJSON(PATHS.orders);

  let result = workers.map(w => {
    const wOrders = orders.filter(o => o.worker_id === w.id);
    return { ...w, total_orders: wOrders.length, orders_history: wOrders };
  });

  // Filter by area (partial, case-insensitive)
  if (req.query.area) {
    const area = req.query.area.trim().toLowerCase();
    result = result.filter(w => w.area.toLowerCase().includes(area));
  }

  // Filter by status
  if (req.query.status) {
    result = result.filter(w => w.status === req.query.status);
  }

  res.json(result);
});

// GET /api/workers/:id
app.get('/api/workers/:id', (req, res) => {
  const workers = readJSON(PATHS.workers);
  const orders  = readJSON(PATHS.orders);
  const w = workers.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Worker not found' });
  const wOrders = orders.filter(o => o.worker_id === w.id);
  res.json({ ...w, orders_history: wOrders });
});

// POST /api/workers
app.post('/api/workers', (req, res) => {
  const errs = [];
  if (!validate.required(req.body.name))         errs.push('name is required');
  if (!validate.required(req.body.phone))        errs.push('phone is required');
  if (!validate.phone(req.body.phone))           errs.push('phone must be 10-11 digits starting with 0');
  if (!validate.nationalId(req.body.national_id)) errs.push('national_id must be 14 digits if provided');
  if (req.body.status && !validate.wStatus(req.body.status)) errs.push('invalid status');
  if (errs.length) return validationError(res, errs);

  const workers = readJSON(PATHS.workers);
  const newWorker = {
    id: uuidv4(),
    name       : String(req.body.name).trim(),
    phone      : String(req.body.phone).trim(),
    area       : String(req.body.area || '').trim(),
    address    : String(req.body.address || '').trim(),
    national_id: String(req.body.national_id || '').trim(),
    status     : req.body.status || 'available',
    average_rating: null,
    orders_history: [],
    created_at : new Date().toISOString(),
  };
  workers.push(newWorker);
  writeJSON(PATHS.workers, workers);
  res.status(201).json(newWorker);
});

// PUT /api/workers/:id
app.put('/api/workers/:id', (req, res) => {
  const workers = readJSON(PATHS.workers);
  const idx = workers.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Worker not found' });

  const allowed = ['name', 'phone', 'area', 'address', 'national_id', 'status'];
  allowed.forEach(f => { if (req.body[f] !== undefined) workers[idx][f] = req.body[f]; });
  workers[idx].updated_at = new Date().toISOString();

  writeJSON(PATHS.workers, workers);
  res.json(workers[idx]);
});

// DELETE /api/workers/:id
app.delete('/api/workers/:id', (req, res) => {
  let workers = readJSON(PATHS.workers);
  const exists = workers.find(x => x.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Worker not found' });
  workers = workers.filter(x => x.id !== req.params.id);
  writeJSON(PATHS.workers, workers);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
// ORDERS API
// ════════════════════════════════════════════════════════════

// GET /api/orders — list all orders (optional ?date=YYYY-MM-DD&today=1&status=X)
app.get('/api/orders', (req, res) => {
  let orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const workers   = readJSON(PATHS.workers);

  // Enrich with names + time_status
  orders = orders.map(o => enrichOrder({
    ...o,
    customer_name: customers.find(c => c.id === o.customer_id)?.name || '',
    worker_name  : workers.find(w => w.id === o.worker_id)?.name   || '',
  }));

  // Filter today
  if (req.query.today === '1') {
    const today = new Date().toISOString().split('T')[0];
    orders = orders.filter(o => o.date === today);
  }

  // Filter by date
  if (req.query.date) {
    orders = orders.filter(o => o.date === req.query.date);
  }

  // Filter by status
  if (req.query.status) {
    orders = orders.filter(o => o.status === req.query.status);
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(orders);
});

// GET /api/orders/time-alerts — MUST be before /:id to avoid routing collision
// Returns active orders with time issues sorted: late → due_now → upcoming
app.get('/api/orders/time-alerts', (req, res) => {
  const orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const workers   = readJSON(PATHS.workers);

  const active = orders.filter(o =>
    ['pending', 'dispatched'].includes(o.status) && o.scheduled_time
  );

  const alerts = active
    .map(o => enrichOrder({
      ...o,
      customer_name: customers.find(c => c.id === o.customer_id)?.name || '',
      worker_name  : workers.find(w => w.id === o.worker_id)?.name     || '',
    }))
    .filter(o => o.time_status !== 'none')
    .sort((a, b) => {
      const rank = { late: 0, due_now: 1, upcoming: 2 };
      return (rank[a.time_status] ?? 9) - (rank[b.time_status] ?? 9);
    });

  res.json(alerts);
});

// GET /api/orders/:id
app.get('/api/orders/:id', (req, res) => {
  const orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const workers   = readJSON(PATHS.workers);

  const o = orders.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  res.json(enrichOrder({
    ...o,
    customer: customers.find(c => c.id === o.customer_id) || null,
    worker  : workers.find(w => w.id === o.worker_id)     || null,
  }));
});

// POST /api/orders — create new order
app.post('/api/orders', (req, res) => {
  const errs = [];
  if (!validate.required(req.body.area))    errs.push('area is required');
  if (!validate.required(req.body.address)) errs.push('address is required');
  if (!validate.cost(req.body.cost))        errs.push('cost must be a non-negative number');
  if (req.body.service_type && !validate.serviceType(req.body.service_type)) errs.push('invalid service_type');
  if (req.body.date && !validate.date(req.body.date))                        errs.push('date must be YYYY-MM-DD');
  if (req.body.scheduled_time && !validate.time(req.body.scheduled_time))    errs.push('scheduled_time must be HH:MM');
  if (errs.length) return validationError(res, errs);

  const orders = readJSON(PATHS.orders);
  const newOrder = {
    id              : uuidv4(),
    customer_id     : req.body.customer_id || null,
    worker_id       : null,
    area            : String(req.body.area).trim(),
    address         : String(req.body.address).trim(),
    apartment_size  : Number(req.body.apartment_size) || 0,
    service_type    : req.body.service_type || 'regular',
    cost            : Number(req.body.cost) || 0,
    status          : 'pending',
    date            : req.body.date || new Date().toISOString().split('T')[0],
    scheduled_time  : req.body.scheduled_time || null,
    customer_feedback: null,
    worker_feedback  : null,
    created_at: new Date().toISOString(),
  };
  orders.push(newOrder);
  writeJSON(PATHS.orders, orders);
  res.status(201).json(enrichOrder(newOrder));
});

// PUT /api/orders/:id — update order (status, worker assignment, cost…)
app.put('/api/orders/:id', (req, res) => {
  const orders  = readJSON(PATHS.orders);
  const workers = readJSON(PATHS.workers);
  const idx = orders.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  const allowed = ['area', 'address', 'apartment_size', 'service_type', 'cost', 'status', 'date', 'scheduled_time', 'customer_id', 'worker_id'];
  allowed.forEach(f => { if (req.body[f] !== undefined) orders[idx][f] = req.body[f]; });
  orders[idx].updated_at = new Date().toISOString();

  // Auto-update worker status when dispatching
  if (req.body.status === 'dispatched' && req.body.worker_id) {
    const wIdx = workers.findIndex(w => w.id === req.body.worker_id);
    if (wIdx !== -1) {
      workers[wIdx].status = 'busy';
      writeJSON(PATHS.workers, workers);
    }
  }

  // Free worker when order completes or cancels
  if ((req.body.status === 'completed' || req.body.status === 'cancelled') && orders[idx].worker_id) {
    const wIdx = workers.findIndex(w => w.id === orders[idx].worker_id);
    if (wIdx !== -1) {
      workers[wIdx].status = 'available';
      writeJSON(PATHS.workers, workers);
    }
  }

  writeJSON(PATHS.orders, orders);
  res.json(enrichOrder(orders[idx]));
});
app.delete('/api/orders/:id', (req, res) => {
  let orders = readJSON(PATHS.orders);
  const exists = orders.find(x => x.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Order not found' });
  orders = orders.filter(x => x.id !== req.params.id);
  writeJSON(PATHS.orders, orders);
  res.json({ success: true });
});

// ── Feedback endpoints (public — no auth) ────────────────────

// POST /api/feedback/customer/:orderId — customer rates the worker
app.post('/api/feedback/customer/:orderId', (req, res) => {
  const orders  = readJSON(PATHS.orders);
  const workers = readJSON(PATHS.workers);
  const idx = orders.findIndex(x => x.id === req.params.orderId);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  orders[idx].customer_feedback = {
    rating: Number(req.body.rating),
    notes : req.body.notes || '',
    submitted_at: new Date().toISOString(),
  };

  // Recalculate worker average rating
  const wIdx = workers.findIndex(w => w.id === orders[idx].worker_id);
  if (wIdx !== -1) recalcRating(workers[wIdx], orders, 'worker');

  writeJSON(PATHS.orders, orders);
  if (wIdx !== -1) writeJSON(PATHS.workers, workers);

  res.json({ success: true, order: orders[idx] });
});

// POST /api/feedback/worker/:orderId — worker rates the customer
app.post('/api/feedback/worker/:orderId', (req, res) => {
  const orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const idx = orders.findIndex(x => x.id === req.params.orderId);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  orders[idx].worker_feedback = {
    rating: Number(req.body.rating),
    notes : req.body.notes || '',
    submitted_at: new Date().toISOString(),
  };

  // Recalculate customer average rating
  const cIdx = customers.findIndex(c => c.id === orders[idx].customer_id);
  if (cIdx !== -1) recalcRating(customers[cIdx], orders, 'customer');

  writeJSON(PATHS.orders, orders);
  if (cIdx !== -1) writeJSON(PATHS.customers, customers);

  res.json({ success: true, order: orders[idx] });
});

// GET /api/feedback/order/:orderId — get order info for feedback page
app.get('/api/feedback/order/:orderId', (req, res) => {
  const orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const workers   = readJSON(PATHS.workers);
  const o = orders.find(x => x.id === req.params.orderId);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json({
    id          : o.id,
    date        : o.date,
    service_type: o.service_type,
    area        : o.area,
    customer_name: customers.find(c => c.id === o.customer_id)?.name || '',
    worker_name  : workers.find(w => w.id === o.worker_id)?.name     || '',
    customer_feedback: o.customer_feedback,
    worker_feedback  : o.worker_feedback,
  });
});

// ════════════════════════════════════════════════════════════
// ANALYTICS API
// ════════════════════════════════════════════════════════════

app.get('/api/analytics', (req, res) => {
  const orders = readJSON(PATHS.orders);
  const today  = new Date();

  const todayStr = today.toISOString().split('T')[0];

  // Week start (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Month start
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const completed = orders.filter(o => o.status === 'completed');

  const daily   = completed.filter(o => o.date === todayStr)                     .reduce((s, o) => s + o.cost, 0);
  const weekly  = completed.filter(o => o.date >= weekStartStr)                  .reduce((s, o) => s + o.cost, 0);
  const monthly = completed.filter(o => o.date >= monthStartStr)                 .reduce((s, o) => s + o.cost, 0);

  // Area demand (all orders)
  const areaCounts = {};
  orders.forEach(o => {
    if (!o.area) return;
    areaCounts[o.area] = (areaCounts[o.area] || 0) + 1;
  });
  const areasSorted = Object.entries(areaCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));

  // Service type distribution
  const total   = orders.length;
  const regular = orders.filter(o => o.service_type === 'regular').length;
  const deep    = orders.filter(o => o.service_type === 'deep').length;

  // Status counts for today
  const todayOrders = orders.filter(o => o.date === todayStr);

  res.json({
    revenue: { daily, weekly, monthly },
    areas: areasSorted,
    service_types: {
      total,
      regular,
      deep,
      regular_pct: total ? Math.round((regular / total) * 100) : 0,
      deep_pct   : total ? Math.round((deep    / total) * 100) : 0,
    },
    today_summary: {
      total    : todayOrders.length,
      pending  : todayOrders.filter(o => o.status === 'pending').length,
      dispatched: todayOrders.filter(o => o.status === 'dispatched').length,
      completed: todayOrders.filter(o => o.status === 'completed').length,
      cancelled: todayOrders.filter(o => o.status === 'cancelled').length,
    },
  });
});

// ════════════════════════════════════════════════════════════
// SETTINGS API  (WA templates + future config)
// ════════════════════════════════════════════════════════════

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const settings = readJSON(PATHS.settings);
  res.json(settings);
});

// PUT /api/settings — update templates
app.put('/api/settings', (req, res) => {
  const settings = readJSON(PATHS.settings);

  // Only allow updating wa_templates fields
  if (req.body.wa_templates && typeof req.body.wa_templates === 'object') {
    const allowed = ['customer_ar', 'customer_en', 'worker_ar', 'worker_en'];
    allowed.forEach(k => {
      if (req.body.wa_templates[k] !== undefined) {
        settings.wa_templates[k] = req.body.wa_templates[k];
      }
    });
  }
  settings.updated_at = new Date().toISOString();
  writeJSON(PATHS.settings, settings);
  res.json({ success: true, settings });
});

// ════════════════════════════════════════════════════════════
// EXPORT API — CSV + full JSON backup
// ════════════════════════════════════════════════════════════

function toCSV(rows, cols) {
  const header = cols.map(c => `"${c.label}"`).join(',');
  const lines  = rows.map(row =>
    cols.map(c => {
      const v = String(c.get ? c.get(row) : (row[c.key] ?? '')).replace(/"/g, '""');
      return `"${v}"`;
    }).join(',')
  );
  return [header, ...lines].join('\r\n');
}

// GET /api/export/orders.csv
app.get('/api/export/orders.csv', (req, res) => {
  const orders    = readJSON(PATHS.orders);
  const customers = readJSON(PATHS.customers);
  const workers   = readJSON(PATHS.workers);

  let rows = orders.map(o => ({
    ...o,
    customer_name: customers.find(c => c.id === o.customer_id)?.name || '',
    worker_name  : workers.find(w => w.id === o.worker_id)?.name     || '',
  }));

  if (req.query.date)    rows = rows.filter(r => r.date === req.query.date);
  if (req.query.status)  rows = rows.filter(r => r.status === req.query.status);
  if (req.query.today === '1') {
    const today = new Date().toISOString().split('T')[0];
    rows = rows.filter(r => r.date === today);
  }

  rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const cols = [
    { label: 'ID',           key: 'id' },
    { label: 'Date',         key: 'date' },
    { label: 'Scheduled',    key: 'scheduled_time' },
    { label: 'Customer',     key: 'customer_name' },
    { label: 'Worker',       key: 'worker_name' },
    { label: 'Area',         key: 'area' },
    { label: 'Address',      key: 'address' },
    { label: 'Size (m²)',    key: 'apartment_size' },
    { label: 'Service',      key: 'service_type' },
    { label: 'Cost',         key: 'cost' },
    { label: 'Status',       key: 'status' },
    { label: 'Cust.Rating',  get: r => r.customer_feedback?.rating || '' },
    { label: 'Cust.Notes',   get: r => r.customer_feedback?.notes  || '' },
    { label: 'Wrkr.Rating',  get: r => r.worker_feedback?.rating   || '' },
    { label: 'Wrkr.Notes',   get: r => r.worker_feedback?.notes    || '' },
  ];

  const csv = '\uFEFF' + toCSV(rows, cols); // BOM for Excel Arabic support
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// GET /api/export/customers.csv
app.get('/api/export/customers.csv', (req, res) => {
  const customers = readJSON(PATHS.customers);
  const orders    = readJSON(PATHS.orders);

  const rows = customers.map(c => ({
    ...c,
    total_orders: orders.filter(o => o.customer_id === c.id).length,
    total_spend : orders.filter(o => o.customer_id === c.id && o.status === 'completed')
                        .reduce((s, o) => s + (o.cost || 0), 0),
  }));

  const cols = [
    { label: 'ID',            key: 'id' },
    { label: 'Name',          key: 'name' },
    { label: 'Phone',         key: 'phone' },
    { label: 'Area',          key: 'area' },
    { label: 'Address',       key: 'address' },
    { label: 'Avg.Rating',    key: 'average_rating' },
    { label: 'Total Orders',  key: 'total_orders' },
    { label: 'Total Spend',   key: 'total_spend' },
    { label: 'Created',       key: 'created_at' },
  ];

  const csv = '\uFEFF' + toCSV(rows, cols);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// GET /api/export/workers.csv
app.get('/api/export/workers.csv', (req, res) => {
  const workers = readJSON(PATHS.workers);
  const orders  = readJSON(PATHS.orders);

  const rows = workers.map(w => ({
    ...w,
    total_orders   : orders.filter(o => o.worker_id === w.id).length,
    completed_orders: orders.filter(o => o.worker_id === w.id && o.status === 'completed').length,
  }));

  const cols = [
    { label: 'ID',              key: 'id' },
    { label: 'Name',            key: 'name' },
    { label: 'Phone',           key: 'phone' },
    { label: 'National ID',     key: 'national_id' },
    { label: 'Area',            key: 'area' },
    { label: 'Status',          key: 'status' },
    { label: 'Avg.Rating',      key: 'average_rating' },
    { label: 'Total Orders',    key: 'total_orders' },
    { label: 'Completed',       key: 'completed_orders' },
    { label: 'Created',         key: 'created_at' },
  ];

  const csv = '\uFEFF' + toCSV(rows, cols);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="workers-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// GET /api/export/backup.json — full data backup
app.get('/api/export/backup.json', (req, res) => {
  const backup = {
    exported_at: new Date().toISOString(),
    version    : '1.0',
    customers  : readJSON(PATHS.customers),
    workers    : readJSON(PATHS.workers),
    orders     : readJSON(PATHS.orders),
    settings   : readJSON(PATHS.settings),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(backup);
});

// ── Catch-all: serve SPA ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Service Tracking Dashboard`);
  console.log(`   → http://localhost:${PORT}\n`);
});
