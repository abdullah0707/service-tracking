// ============================================================
// public/js/i18n.js — Bilingual support (Arabic / English)
// ============================================================

const TRANSLATIONS = {
  ar: {
    // ── App shell ───────────────────────────────────────────
    appName         : 'Service Tracking',
    appTagline      : 'لوحة إدارة خدمات التنظيف',
    darkMode        : 'الوضع الداكن',
    lightMode       : 'الوضع الفاتح',
    lang            : 'English',

    // ── Nav ─────────────────────────────────────────────────
    navDashboard    : 'اليوم',
    navCallCenter   : 'كول سنتر',
    navCustomers    : 'العملاء',
    navWorkers      : 'العمالة',

    // ── Dashboard ───────────────────────────────────────────
    todayAgenda     : 'أجندة اليوم',
    todayDate       : 'تاريخ اليوم',
    financialReport : 'التقرير المالي',
    dailyRevenue    : 'إيرادات اليوم',
    weeklyRevenue   : 'إيرادات الأسبوع',
    monthlyRevenue  : 'إيرادات الشهر',
    topAreas        : 'أكثر المناطق طلباً',
    serviceBreakdown: 'توزيع نوع الخدمة',
    regular         : 'عادي',
    deep            : 'عميق',
    ordersToday     : 'أوردرات اليوم',
    noOrdersToday   : 'لا توجد أوردرات لليوم',
    pending         : 'قيد الانتظار',
    dispatched      : 'جاري التنفيذ',
    completed       : 'منتهية',
    cancelled       : 'ملغية',

    // ── Call Center ─────────────────────────────────────────
    newOrder        : 'أوردر جديد',
    allOrders       : 'جميع الأوردرات',
    customerName    : 'اسم العميل',
    phone           : 'الهاتف',
    area            : 'المنطقة',
    detailedAddress : 'العنوان التفصيلي',
    apartmentSize   : 'مساحة الشقة (م²)',
    serviceType     : 'نوع الخدمة',
    cost            : 'التكلفة (ج.م)',
    date            : 'التاريخ',
    selectCustomer  : '— اختر عميلاً أو أدخل جديد —',
    createNew       : 'إضافة عميل جديد',
    availableWorkers: 'العمالة المتاحة في المنطقة',
    noAvailableWorkers: 'لا توجد عمالة متاحة في هذه المنطقة',
    assignWorker    : 'تسكين العامل',
    assignAndDispatch: 'تسكين وإرسال',
    submit          : 'حفظ الأوردر',
    selectWorker    : 'اختر عامل',

    // ── Smart alerts ────────────────────────────────────────
    alertLowRatingCustomer: '⚠️ تنبيه: هذا العميل لديه شكاوى سابقة (تقييم: {rating} ★)',
    alertLowRatingWorker  : '⚠️ تنبيه: هذا العامل لديه تقييم منخفض سابقاً (تقييم: {rating} ★)',

    // ── Feedback & WhatsApp ─────────────────────────────────
    feedbackLinks   : 'روابط التقييم',
    customerFeedbackLink: 'رابط تقييم العامل (للعميل)',
    workerFeedbackLink  : 'رابط تقييم العميل (للعامل)',
    sendViaWhatsApp : 'إرسال عبر واتساب',
    copyLink        : 'نسخ الرابط',
    linkCopied      : 'تم النسخ!',
    waMessageCustomer: '🌟 شكراً لاختيارك خدمتنا!\nيسعدنا سماع رأيك — يرجى تقييم جودة الخدمة التي حصلت عليها:\n{link}',
    waMessageWorker  : '🌟 شكراً على عملك الرائع!\nيرجى تقييم العميل الذي خدمته اليوم:\n{link}',

    // ── Customers ───────────────────────────────────────────
    customers       : 'العملاء',
    addCustomer     : 'إضافة عميل',
    editCustomer    : 'تعديل بيانات العميل',
    customerHistory : 'تاريخ العميل',
    totalOrders     : 'إجمالي الأوردرات',
    avgRating       : 'متوسط التقييم',
    noRating        : 'لا يوجد تقييم',
    noOrdersYet     : 'لا توجد أوردرات',
    address         : 'العنوان',
    searchPlaceholder: 'ابحث بالاسم أو الهاتف أو المنطقة...',

    // ── Workers ─────────────────────────────────────────────
    workers         : 'العمالة',
    addWorker       : 'إضافة عامل',
    editWorker      : 'تعديل بيانات العامل',
    workerHistory   : 'تاريخ العامل',
    nationalId      : 'رقم الهوية',
    status          : 'الحالة',
    available       : 'متاح',
    busy            : 'مشغول',
    off             : 'إجازة',
    workerAreas     : 'المناطق المخدومة',
    totalCompleted  : 'إجمالي الأوردرات المنفذة',

    // ── Common ──────────────────────────────────────────────
    save            : 'حفظ',
    cancel          : 'إلغاء',
    delete          : 'حذف',
    edit            : 'تعديل',
    view            : 'عرض',
    confirm         : 'تأكيد',
    confirmDelete   : 'هل أنت متأكد من الحذف؟',
    yes             : 'نعم',
    no              : 'لا',
    loading         : 'جارٍ التحميل...',
    error           : 'حدث خطأ',
    success         : 'تم بنجاح',
    currency        : 'ج.م',
    ratingLabel     : 'تقييمك',
    notesLabel      : 'ملاحظات',
    submitFeedback  : 'إرسال التقييم',
    feedbackSent    : 'تم إرسال تقييمك، شكراً!',
    alreadyRated    : 'تم التقييم مسبقاً',
    orderNotFound   : 'الأوردر غير موجود',
    order           : 'أوردر',
    from            : 'من',
    egp             : 'ج.م',
    sqm             : 'م²',
  },

  en: {
    // ── App shell ───────────────────────────────────────────
    appName         : 'Service Tracking',
    appTagline      : 'Cleaning Services Dashboard',
    darkMode        : 'Dark Mode',
    lightMode       : 'Light Mode',
    lang            : 'عربي',

    // ── Nav ─────────────────────────────────────────────────
    navDashboard    : 'Today',
    navCallCenter   : 'Call Center',
    navCustomers    : 'Customers',
    navWorkers      : 'Workers',

    // ── Dashboard ───────────────────────────────────────────
    todayAgenda     : "Today's Agenda",
    todayDate       : "Today's Date",
    financialReport : 'Financial Report',
    dailyRevenue    : "Today's Revenue",
    weeklyRevenue   : 'Weekly Revenue',
    monthlyRevenue  : 'Monthly Revenue',
    topAreas        : 'Top Demand Areas',
    serviceBreakdown: 'Service Type Breakdown',
    regular         : 'Regular',
    deep            : 'Deep Clean',
    ordersToday     : "Today's Orders",
    noOrdersToday   : 'No orders for today',
    pending         : 'Pending',
    dispatched      : 'Dispatched',
    completed       : 'Completed',
    cancelled       : 'Cancelled',

    // ── Call Center ─────────────────────────────────────────
    newOrder        : 'New Order',
    allOrders       : 'All Orders',
    customerName    : 'Customer Name',
    phone           : 'Phone',
    area            : 'Area',
    detailedAddress : 'Detailed Address',
    apartmentSize   : 'Apartment Size (m²)',
    serviceType     : 'Service Type',
    cost            : 'Cost (EGP)',
    date            : 'Date',
    selectCustomer  : '— Select a customer or add new —',
    createNew       : 'Add New Customer',
    availableWorkers: 'Available Workers in Area',
    noAvailableWorkers: 'No available workers in this area',
    assignWorker    : 'Assign Worker',
    assignAndDispatch: 'Assign & Dispatch',
    submit          : 'Save Order',
    selectWorker    : 'Select Worker',

    // ── Smart alerts ────────────────────────────────────────
    alertLowRatingCustomer: '⚠️ Alert: This customer has previous complaints (rating: {rating} ★)',
    alertLowRatingWorker  : '⚠️ Alert: This worker has a low previous rating (rating: {rating} ★)',

    // ── Feedback & WhatsApp ─────────────────────────────────
    feedbackLinks   : 'Feedback Links',
    customerFeedbackLink: 'Rate Worker Link (for Customer)',
    workerFeedbackLink  : 'Rate Customer Link (for Worker)',
    sendViaWhatsApp : 'Send via WhatsApp',
    copyLink        : 'Copy Link',
    linkCopied      : 'Copied!',
    waMessageCustomer: '🌟 Thank you for choosing our service!\nWe would love to hear your feedback — please rate the service you received:\n{link}',
    waMessageWorker  : '🌟 Thank you for your great work!\nPlease rate the customer you served today:\n{link}',

    // ── Customers ───────────────────────────────────────────
    customers       : 'Customers',
    addCustomer     : 'Add Customer',
    editCustomer    : 'Edit Customer',
    customerHistory : 'Customer History',
    totalOrders     : 'Total Orders',
    avgRating       : 'Avg. Rating',
    noRating        : 'No rating yet',
    noOrdersYet     : 'No orders yet',
    address         : 'Address',
    searchPlaceholder: 'Search by name, phone or area...',

    // ── Workers ─────────────────────────────────────────────
    workers         : 'Workers',
    addWorker       : 'Add Worker',
    editWorker      : 'Edit Worker',
    workerHistory   : 'Worker History',
    nationalId      : 'National ID',
    status          : 'Status',
    available       : 'Available',
    busy            : 'Busy',
    off             : 'Off / Vacation',
    workerAreas     : 'Service Areas',
    totalCompleted  : 'Total Completed Orders',

    // ── Common ──────────────────────────────────────────────
    save            : 'Save',
    cancel          : 'Cancel',
    delete          : 'Delete',
    edit            : 'Edit',
    view            : 'View',
    confirm         : 'Confirm',
    confirmDelete   : 'Are you sure you want to delete?',
    yes             : 'Yes',
    no              : 'No',
    loading         : 'Loading...',
    error           : 'An error occurred',
    success         : 'Done successfully',
    currency        : 'EGP',
    ratingLabel     : 'Your Rating',
    notesLabel      : 'Notes',
    submitFeedback  : 'Submit Feedback',
    feedbackSent    : 'Your feedback has been sent, thank you!',
    alreadyRated    : 'Already rated',
    orderNotFound   : 'Order not found',
    order           : 'Order',
    from            : 'from',
    egp             : 'EGP',
    sqm             : 'm²',
  }
};

// ── i18n helpers ─────────────────────────────────────────────
window.i18n = {
  current: 'ar',

  t(key, vars = {}) {
    let str = TRANSLATIONS[this.current][key] || TRANSLATIONS['ar'][key] || key;
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
    return str;
  },

  toggle() {
    this.current = this.current === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = this.current;
    document.documentElement.dir  = this.current === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', this.current === 'ar');
    document.body.classList.toggle('ltr', this.current === 'en');
    localStorage.setItem('st_lang', this.current);
    this.applyAll();
  },

  init() {
    const saved = localStorage.getItem('st_lang') || 'ar';
    this.current = saved;
    document.documentElement.lang = saved;
    document.documentElement.dir  = saved === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', saved === 'ar');
    document.body.classList.toggle('ltr', saved === 'en');
  },

  applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
    });
  }
};
