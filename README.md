# 🧹 Service Tracking Dashboard
### لوحة إدارة خدمات التنظيف المنزلي

نظام MVP متكامل لإدارة وتشغيل شركة توفير عمالة تنظيف منازل.  
A full MVP system for managing a home cleaning service company.

---

## 🚀 تشغيل المشروع / Quick Start

```bash
# 1. تثبيت المكتبات / Install dependencies
npm install

# 2. تشغيل السيرفر / Start the server
node server.js

# 3. افتح المتصفح / Open browser
# → http://localhost:3000
```

> **المتطلبات / Requirements:** Node.js 16+ | لا قواعد بيانات مطلوبة / No database needed

---

## 📁 هيكل الملفات / File Structure

```
service-tracking/
├── server.js              # Express backend — كل الـ APIs
├── package.json
├── data/                  # قاعدة البيانات (ملفات JSON)
│   ├── customers.json     # بيانات العملاء
│   ├── workers.json       # بيانات العمالة
│   ├── orders.json        # الأوردرات
│   └── settings.json      # إعدادات النظام (رسائل WA)
└── public/
    ├── index.html         # الـ SPA shell
    ├── feedback.html      # صفحة التقييم (public)
    ├── css/
    │   └── style.css      # كل الـ styles (light/dark/RTL/LTR)
    └── js/
        ├── i18n.js        # نظام الترجمة عربي/إنجليزي
        ├── api.js         # API client + utils
        ├── app.js         # SPA Router + keyboard shortcuts
        └── pages/
            ├── dashboard.js   # الشاشة الرئيسية
            ├── callcenter.js  # كول سنتر
            ├── customers.js   # إدارة العملاء
            ├── workers.js     # إدارة العمالة
            └── settings.js    # الإعدادات
```

---

## 🖥️ الشاشات / Pages

| الشاشة | المفتاح | الوظيفة |
|--------|---------|---------|
| **اليوم** | `1` | أجندة اليوم + تقارير مالية + تنبيهات الوقت |
| **كول سنتر** | `2` | إنشاء أوردرات + تسكين عمالة + روابط تقييم WA |
| **العملاء** | `3` | إدارة + تاريخ + تصدير CSV |
| **العمالة** | `4` | إدارة + حالة + تاريخ + تصدير CSV |
| **الإعدادات** | `5` | تخصيص رسائل الواتساب |

> ⌨️ **اختصارات لوحة المفاتيح:** `1-5` للتنقل | `N` أوردر جديد | `R` تحديث

---

## 🔌 API Reference

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers (with order count) |
| GET | `/api/customers/:id` | Single customer + full order history |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Workers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers?area=X&status=available` | List with filters |
| GET | `/api/workers/:id` | Single worker + history |
| POST | `/api/workers` | Create worker |
| PUT | `/api/workers/:id` | Update (including status) |
| DELETE | `/api/workers/:id` | Delete worker |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders?today=1&status=pending` | List with filters |
| GET | `/api/orders/time-alerts` | Active orders with time issues |
| GET | `/api/orders/:id` | Single order (enriched) |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders/:id` | Update (status, worker, scheduled_time…) |
| DELETE | `/api/orders/:id` | Delete order |

### Feedback (public — no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback/order/:id` | Order info for feedback page |
| POST | `/api/feedback/customer/:id` | Customer rates worker |
| POST | `/api/feedback/worker/:id` | Worker rates customer |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get WA templates + config |
| PUT | `/api/settings` | Update WA message templates |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Revenue + areas + service types + today summary |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/orders.csv?today=1` | Export orders as CSV |
| GET | `/api/export/customers.csv` | Export customers as CSV |
| GET | `/api/export/workers.csv` | Export workers as CSV |
| GET | `/api/export/backup.json` | Full JSON backup |

---

## ⏰ نظام التوقيت / Time Status System

كل أوردر له حقل `scheduled_time` (HH:MM اختياري).  
السيرفر يحسب `time_status` تلقائياً:

| الحالة | المعنى | اللون |
|--------|---------|-------|
| `late` | تجاوز الموعد بأكثر من 15 دقيقة | 🔴 أحمر نابض |
| `due_now` | في نطاق ±15 دقيقة من الموعد | 🟡 برتقالي نابض |
| `upcoming` | أكثر من 15 دقيقة في المستقبل | 🔵 أزرق |
| `none` | لا يوجد موعد محدد | — |

---

## 📱 رسائل الواتساب / WhatsApp Templates

تُعدَّل من **الإعدادات ← رسائل الواتساب**.  
استخدم `{link}` كمكان رابط التقييم في الرسالة.

```
مثال:
🌟 شكراً لاختيارك خدمتنا!
يرجى تقييم الخدمة: {link}
```

الرسائل محفوظة في `data/settings.json` وتُحمَّل تلقائياً.

---

## 💾 النسخ الاحتياطي / Backup

```bash
# تحميل نسخة احتياطية كاملة
curl http://localhost:3000/api/export/backup.json -o backup.json

# أو من المتصفح
# → http://localhost:3000/api/export/backup.json
```

---

## 🔧 Server-Side Validation

| الحقل | القاعدة |
|-------|---------|
| `name` | مطلوب / required |
| `phone` | 10–11 أرقام تبدأ بـ 0 |
| `national_id` | 14 رقم بالضبط (إن وُجد) |
| `cost` | رقم ≥ 0 |
| `service_type` | `regular` أو `deep` |
| `status` | `pending/dispatched/completed/cancelled` |
| `scheduled_time` | تنسيق `HH:MM` (إن وُجد) |
| `date` | تنسيق `YYYY-MM-DD` (إن وُجد) |

---

## 🎨 الميزات / Features

- ✅ **ثنائي اللغة** — عربي (RTL) + إنجليزي (LTR)
- ✅ **وضعان** — داكن / فاتح مع حفظ التفضيل
- ✅ **Responsive** — Desktop + Mobile + Bottom Nav
- ✅ **نظام التقييم** — روابط public بدون تسجيل دخول
- ✅ **تنبيهات ذكية** — تحذير التقييم المنخفض (<3 نجوم)
- ✅ **تنبيهات الوقت** — متأخر / حان وقته / قادم (نابض)
- ✅ **Auto-refresh** — Dashboard كل 60 ثانية
- ✅ **اختصارات** — لوحة مفاتيح للتنقل السريع
- ✅ **تصدير CSV** — أوردرات + عملاء + عمالة
- ✅ **طباعة** — تقرير يومي احترافي
- ✅ **Validation** — Frontend + Backend
- ✅ **Atomic writes** — حماية من تلف الملفات

---

## 📊 نماذج البيانات / Data Models

```json
// Order
{
  "id": "uuid",
  "customer_id": "uuid",
  "worker_id": "uuid | null",
  "area": "string",
  "address": "string",
  "apartment_size": 120,
  "service_type": "regular | deep",
  "cost": 250,
  "status": "pending | dispatched | completed | cancelled",
  "date": "YYYY-MM-DD",
  "scheduled_time": "HH:MM | null",
  "customer_feedback": { "rating": 1-5, "notes": "string" } | null,
  "worker_feedback":   { "rating": 1-5, "notes": "string" } | null
}
```

---

*Service Tracking Dashboard — MVP v1.0*  
*Built with Node.js + Express + Vanilla JS*
#   s e r v i c e - t r a c k i n g  
 