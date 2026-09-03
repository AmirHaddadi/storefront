'use strict';

/* =========================================================
   Storefront — پنل ادمین (جدا از script.js مشتری)
   ========================================================= */

const THEME_STORAGE_KEY = 'brand_theme_v1';
const ADMIN_SECTION_LABELS = { users: 'کاربران', orders: 'سفارشات', products: 'محصولات', coupons: 'کدهای تخفیف', appearance: 'ظاهر سایت', admins: 'ادمین‌ها' };
// بخش گزارشات پشت REPORTS_ENABLED (سمت سرور) است؛ فقط وقتی /admin/api/me گزارشش کنه به
// نقشه‌های ADMIN_SECTION_* اضافه می‌شه (initAdminShell) — تا وقتی خاموشه، نه در ناوبری دیده
// می‌شه نه روتر کلاینت اصلاً چیزی درباره‌ش می‌دونه.
let REPORTS_ENABLED_UI = false;
const COLOR_PRESET_LABELS = { violet: 'بنفش', rose: 'صورتی', emerald: 'زمردی', sunset: 'غروب آفتاب' };
const COLOR_PRESET_SWATCHES = {
  violet: ['#7c4dff', '#ff5fa8', '#ffb84d'],
  rose: ['#b6339e', '#ff6fa5', '#ffb84d'],
  emerald: ['#12946b', '#ff8a65', '#ffcc4d'],
  sunset: ['#ff7a45', '#ff4f8b', '#ffd166'],
};
const ORDER_STATUS_LABELS = {
  awaiting_payment_confirmation: 'در انتظار تایید پرداخت',
  payment_rejected: 'پرداخت رد شد',
  registered: 'ثبت شد',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال شد',
  delivered: 'تحویل داده شد',
};
const SHIPPING_METHOD_LABELS = { tipax: 'تیپاکس', post: 'پست پیشتاز' };
const SHIPPING_PAYMENT_LABELS = { postpaid: 'پس‌کرایه', prepaid: 'پیش‌کرایه' };
const PAYMENT_METHOD_LABELS = { bank_gateway: 'درگاه بانکی', card_to_card: 'کارت به کارت' };
const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
function materialCellHTML(material) {
  return material ? `<span class="admin-material-cell">${material}</span>` : '—';
}

/* ---------- تبدیل تقویم جلالی↔میلادی (کتابخانه‌ی jalaali.min.js) ---------- */
const JALALI_MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function toFaDigits(value) {
  return String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function isoToJalaliParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return window.jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function formatJalaliDisplay(iso) {
  const parts = isoToJalaliParts(iso);
  if (!parts) return '';
  return `${toFaDigits(parts.jd)} ${JALALI_MONTH_NAMES[parts.jm - 1]} ${toFaDigits(parts.jy)}`;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
}

function initColorPreset() {
  const cached = localStorage.getItem('brand_color_preset_v1');
  if (cached) document.documentElement.setAttribute('data-color-preset', cached);
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('fa-IR') + ' تومان';
}
function formatDate(iso) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

/* ---------- فیلدهای عددی: رقم فارسی + جداکننده‌ی سه‌رقمی (data-fa-number) ---------- */
function toEnglishDigits(value) {
  return String(value || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
function formatFaNumber(value) {
  const digitsOnly = toEnglishDigits(value).replace(/[^\d.-]/g, '');
  if (digitsOnly === '' || digitsOnly === '-') return digitsOnly;
  const num = Number(digitsOnly);
  return Number.isNaN(num) ? '' : num.toLocaleString('fa-IR');
}
function faNumberValue(input) {
  const digitsOnly = toEnglishDigits(input.value).replace(/[^\d.-]/g, '');
  return digitsOnly === '' ? null : Number(digitsOnly);
}
function bindFaNumberInput(input) {
  input.type = 'text';
  input.setAttribute('inputmode', 'numeric');
  input.value = formatFaNumber(input.value);
  input.addEventListener('input', () => {
    const caretFromEnd = input.value.length - input.selectionStart;
    input.value = formatFaNumber(input.value);
    const pos = Math.max(0, input.value.length - caretFromEnd);
    input.setSelectionRange(pos, pos);
  });
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    location.href = '/admin/login';
    throw new Error('unauthorized');
  }
  return res;
}

function forbiddenHTML(section) {
  return `<div class="admin-empty"><i class="fa-solid fa-lock" style="font-size:26px;margin-bottom:10px;display:block;"></i>دسترسی به بخش «${ADMIN_SECTION_LABELS[section] || section}» برای این ادمین فعال نیست.</div>`;
}

/* ---------- صفحه‌ی ورود ---------- */
function initLoginPage() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const token = document.getElementById('admin-token-input').value.trim();
    const errorEl = document.getElementById('admin-token-error');
    errorEl.textContent = '';
    if (!token) { errorEl.textContent = 'توکن را وارد کنید'; return; }

    const res = await fetch('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) { errorEl.textContent = 'توکن نامعتبر است'; return; }
    location.href = '/admin/orders';
  });
}

/* ---------- chrome مشترک (سایدبار: نام ادمین/تم/خروج) ---------- */
async function initAdminShell() {
  const nameEl = document.getElementById('admin-name');
  if (!nameEl) return null;

  const res = await fetch('/admin/api/me');
  if (!res.ok) { location.href = '/admin/login'; return null; }
  const { admin, reportsEnabled } = await res.json();
  nameEl.textContent = admin.isSuperAdmin ? `${admin.name} (سوپرادمین)` : admin.name;

  REPORTS_ENABLED_UI = Boolean(reportsEnabled);
  if (REPORTS_ENABLED_UI) {
    ADMIN_SECTION_LABELS.reports = 'گزارشات';
    ADMIN_SECTION_PATHS.reports = '/admin/reports';
    ADMIN_SECTION_RENDERERS.reports = renderReportsSection;
  } else {
    document.querySelector('.admin-nav-link[data-section="reports"]')?.remove();
  }

  document.getElementById('admin-theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('admin-logout-btn').addEventListener('click', async () => {
    await fetch('/admin/api/logout', { method: 'POST' });
    location.href = '/admin/login';
  });
  initTelegramLinkButton(admin);

  return admin;
}

/* ---------- اتصال حساب تلگرام برای مدیریت هم‌زمان از ربات ---------- */
function initTelegramLinkButton(admin) {
  const btn = document.getElementById('admin-telegram-link-btn');
  if (!btn) return;
  let isLinked = Boolean(admin.telegramChatId);
  updateTelegramLinkButtonLabel();

  function updateTelegramLinkButtonLabel() {
    btn.innerHTML = isLinked
      ? '<i class="fa-brands fa-telegram"></i> قطع اتصال تلگرام'
      : '<i class="fa-brands fa-telegram"></i> اتصال تلگرام';
  }

  btn.addEventListener('click', async () => {
    if (isLinked) {
      const res = await api('/admin/api/telegram/unlink', { method: 'POST' });
      if (!res.ok) { showToast('قطع اتصال با خطا مواجه شد'); return; }
      isLinked = false;
      updateTelegramLinkButtonLabel();
      showToast('اتصال تلگرام قطع شد');
      return;
    }

    const res = await api('/admin/api/telegram/link-token', { method: 'POST' });
    if (!res.ok) { showToast('ساخت لینک اتصال با خطا مواجه شد'); return; }
    const { deepLink } = await res.json();
    window.open(deepLink, '_blank');
    showToast('لینک تلگرام باز شد؛ روی Start در تلگرام بزن');
  });
}

/* ---------- روتر سبک سکشن‌ها (سفارشات/محصولات/کاربران/ادمین‌ها در یک صفحه‌ی مشترک) ---------- */
const ADMIN_SECTION_PATHS = { orders: '/admin/orders', products: '/admin/products', coupons: '/admin/coupons', users: '/admin/users', appearance: '/admin/appearance', admins: '/admin/admins' };
const ADMIN_SECTION_RENDERERS = { orders: renderOrdersSection, products: renderProductsSection, coupons: renderCouponsSection, users: renderUsersSection, appearance: renderAppearanceSection, admins: renderAdminsSection };

function getAdminSectionFromPath(path) {
  return Object.keys(ADMIN_SECTION_PATHS).find(s => ADMIN_SECTION_PATHS[s] === path) || null;
}

function switchAdminSection(section, { pushState = true } = {}) {
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });
  document.getElementById('admin-section-heading').textContent = ADMIN_SECTION_LABELS[section];
  document.getElementById('admin-page-title').textContent = `${ADMIN_SECTION_LABELS[section]} | پنل ادمین استورفرانت`;
  if (pushState) history.pushState({ section }, '', ADMIN_SECTION_PATHS[section]);
  ADMIN_SECTION_RENDERERS[section]();
}

function initAdminRouter() {
  const nav = document.querySelector('.admin-nav');
  if (!nav) return;

  nav.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchAdminSection(link.dataset.section);
    });
  });

  window.addEventListener('popstate', () => {
    switchAdminSection(getAdminSectionFromPath(location.pathname) || 'orders', { pushState: false });
  });

  switchAdminSection(getAdminSectionFromPath(location.pathname) || 'orders', { pushState: false });
}

/* ---------- سفارشات ---------- */
function cardSettingsFormHTML(settings) {
  return `
    <div class="admin-card glass" id="card-settings-card" style="padding:20px;max-width:520px;margin-bottom:20px;">
      <h3 style="margin-bottom:6px;">کارت به کارت اختصاصی</h3>
      <p style="color:var(--color-text-muted);font-size:14px;margin-bottom:18px;">تنها روش پرداخت فعال سایت — این اطلاعات موقع تکمیل سفارش به مشتری نمایش داده می‌شه.</p>
      <form id="card-settings-form" style="display:grid;gap:14px;">
        <div class="form-group">
          <label>شماره کارت</label>
          <input type="text" id="card-settings-number" inputmode="numeric" maxlength="19" placeholder="۱۶ رقم بدون فاصله" style="direction:ltr;text-align:right;" value="${settings.cardToCardNumber || ''}">
        </div>
        <div class="form-group">
          <label>به نام</label>
          <input type="text" id="card-settings-holder" value="${(settings.cardToCardHolder || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="form-group">
          <label>بانک</label>
          <input type="text" id="card-settings-bank" value="${(settings.cardToCardBank || '').replace(/"/g, '&quot;')}">
        </div>
        <button type="submit" class="btn btn-primary">ذخیره اطلاعات کارت</button>
      </form>
    </div>
  `;
}

function wireCardSettingsForm() {
  const form = document.getElementById('card-settings-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      number: document.getElementById('card-settings-number').value.trim(),
      holder: document.getElementById('card-settings-holder').value.trim(),
      bank: document.getElementById('card-settings-bank').value.trim(),
    };
    const r = await api('/admin/api/card-settings', { method: 'PUT', body: JSON.stringify(payload) });
    if (!r.ok) { showToast('ذخیره اطلاعات کارت با خطا مواجه شد'); return; }
    showToast('اطلاعات کارت به‌روزرسانی شد');
  });
}

async function renderOrdersSection() {
  const root = document.getElementById('admin-content');
  const [res, cardSettingsRes] = await Promise.all([api('/admin/api/orders'), api('/admin/api/card-settings')]);
  if (res.status === 403) { root.innerHTML = forbiddenHTML('orders'); return; }
  const orders = await res.json();
  const cardSettings = cardSettingsRes.ok ? await cardSettingsRes.json() : {};

  const tableHTML = !orders.length ? '<div class="admin-empty">هنوز سفارشی ثبت نشده.</div>' : `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>
          <th>کد سفارش</th><th>مشتری</th><th>مبلغ</th><th>ارسال</th><th>پرداخت</th><th>وضعیت</th><th>تاریخ</th><th></th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr class="order-row" data-id="${o.id}" style="cursor:pointer;">
              <td>${o.code}</td>
              <td>${o.customer.name || '—'}<br><span style="color:var(--color-text-muted);font-size:12px;">${o.customer.phone}</span></td>
              <td>${formatPrice(o.total)}</td>
              <td>${SHIPPING_METHOD_LABELS[o.shippingMethod] || '—'} / ${SHIPPING_PAYMENT_LABELS[o.shippingPayment] || '—'}</td>
              <td>${PAYMENT_METHOD_LABELS[o.paymentMethod] || '—'} ${o.receiptImageUrl ? `<a href="/${o.receiptImageUrl}" target="_blank" title="مشاهده رسید" onclick="event.stopPropagation()"><i class="fa-solid fa-image"></i></a>` : ''}</td>
              <td onclick="event.stopPropagation()">
                <input type="text" class="order-status-select" readonly data-popup="list"
                  data-popup-options='${JSON.stringify(Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })))}'
                  data-selected-value="${o.status}" value="${ORDER_STATUS_LABELS[o.status] || o.status}" data-id="${o.id}">
              </td>
              <td>${formatDate(o.createdAt)}</td>
              <td><button type="button" class="icon-btn order-view-btn" data-id="${o.id}" title="مشاهده کامل سفارش" onclick="event.stopPropagation()"><i class="fa-solid fa-eye"></i></button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  root.innerHTML = cardSettingsFormHTML(cardSettings) + tableHTML;
  wireCardSettingsForm();

  async function patchOrderStatus(id, status) {
    const res2 = await api(`/admin/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (res2.ok) showToast('وضعیت سفارش به‌روزرسانی شد');
    else showToast('خطا در به‌روزرسانی وضعیت');
    return res2;
  }

  root.querySelectorAll('.order-status-select').forEach(input => {
    input.addEventListener('popup-select', e => patchOrderStatus(input.dataset.id, e.detail.value));
  });

  function openOrder(id) {
    const order = orders.find(o => o.id === id);
    if (order) openOrderDetailModal(order, patchOrderStatus);
  }
  root.querySelectorAll('.order-view-btn').forEach(btn => btn.addEventListener('click', () => openOrder(btn.dataset.id)));
  root.querySelectorAll('.order-row').forEach(row => row.addEventListener('click', () => openOrder(row.dataset.id)));
}

/* ---------- مودال مشاهده کامل سفارش ---------- */
function openOrderDetailModal(o, patchStatus) {
  const itemsHTML = o.items.map(it => `
    <div class="order-detail-item">
      ${it.image ? `<img src="${it.image.startsWith('http') ? it.image : '/' + it.image.replace(/^\//, '')}" alt="" class="order-detail-item-img">` : '<div class="order-detail-item-img order-detail-item-img--empty"><i class="fa-solid fa-image"></i></div>'}
      <div class="order-detail-item-info">
        <div class="order-detail-item-name">${it.name}</div>
        <div class="order-detail-item-meta">${[it.colorName, it.size ? `سایز ${it.size}` : ''].filter(Boolean).join(' / ') || '—'}</div>
        <div class="order-detail-item-meta">تعداد: ${toFaDigits ? toFaDigits(it.qty) : it.qty} × ${formatPrice(it.price)}</div>
      </div>
      <div class="order-detail-item-total">${formatPrice(it.price * it.qty)}</div>
      <button type="button" class="icon-btn order-detail-item-link-btn" data-product-id="${it.productId}" title="مشاهده صفحه محصول" aria-label="مشاهده صفحه محصول">
        <i class="fa-solid fa-arrow-up-left-from-circle"></i>
      </button>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'order-detail-overlay';
  overlay.innerHTML = `
    <div class="modal glass glass-strong order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <button class="icon-btn modal-close" id="order-detail-close-btn" aria-label="بستن">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
      </button>
      <h3 id="order-detail-title" class="modal-title">سفارش #${o.code}</h3>

      <div class="order-detail-section">
        <h4>وضعیت سفارش</h4>
        <input type="text" class="order-status-select" readonly data-popup="list"
          data-popup-options='${JSON.stringify(Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })))}'
          data-selected-value="${o.status}" value="${ORDER_STATUS_LABELS[o.status] || o.status}" data-id="${o.id}" id="order-detail-status-input">
      </div>

      <div class="order-detail-section">
        <h4>اطلاعات مشتری</h4>
        <div class="order-detail-grid">
          <div><strong>نام:</strong> ${o.customer.name || '—'}</div>
          <div><strong>موبایل:</strong> ${o.customer.phone}</div>
          <div class="order-detail-span2"><strong>آدرس:</strong> ${o.customer.address || '—'}</div>
          ${o.customer.note ? `<div class="order-detail-span2"><strong>توضیحات مشتری:</strong> ${o.customer.note}</div>` : ''}
        </div>
      </div>

      <div class="order-detail-section">
        <h4>ارسال و پرداخت</h4>
        <div class="order-detail-grid">
          <div><strong>روش ارسال:</strong> ${SHIPPING_METHOD_LABELS[o.shippingMethod] || '—'}</div>
          <div><strong>هزینه ارسال:</strong> ${SHIPPING_PAYMENT_LABELS[o.shippingPayment] || '—'}</div>
          <div><strong>روش پرداخت:</strong> ${PAYMENT_METHOD_LABELS[o.paymentMethod] || '—'}</div>
          <div><strong>رسید پرداخت:</strong> ${o.receiptImageUrl ? `<a href="/${o.receiptImageUrl.replace(/^\//, '')}" target="_blank">مشاهده رسید</a>` : '—'}</div>
          ${o.confirmedAt ? `<div><strong>زمان تایید پرداخت:</strong> ${formatDate(o.confirmedAt)}</div>` : ''}
          <div><strong>تاریخ ثبت سفارش:</strong> ${formatDate(o.createdAt)}</div>
        </div>
      </div>

      <div class="order-detail-section">
        <h4>اقلام سفارش</h4>
        <div class="order-detail-items">${itemsHTML}</div>
      </div>

      <div class="order-detail-section">
        <h4>جمع مالی</h4>
        <div class="order-detail-grid">
          ${o.subtotal != null ? `<div><strong>جمع جزء:</strong> ${formatPrice(o.subtotal)}</div>` : ''}
          ${o.discountCode ? `<div><strong>کد تخفیف:</strong> ${o.discountCode} (${formatPrice(o.discountAmount)}-)</div>` : ''}
          <div><strong>هزینه ارسال:</strong> ${formatPrice(o.shippingFee)}</div>
          <div><strong>مبلغ نهایی:</strong> ${formatPrice(o.total)}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 300); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('order-detail-close-btn').addEventListener('click', close);
  document.getElementById('order-detail-status-input').addEventListener('popup-select', async e => {
    const res = await patchStatus(o.id, e.detail.value);
    if (res && res.ok) { o.status = e.detail.value; }
  });

  overlay.querySelectorAll('.order-detail-item-link-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const res = await api(`/admin/api/orders/product-link/${btn.dataset.productId}`);
        if (!res.ok) { showToast('این محصول دیگه در فروشگاه موجود نیست'); return; }
        const { category, code } = await res.json();
        window.open(`/${category}/${code}`, '_blank', 'noopener');
      } catch {
        showToast('خطا در باز کردن صفحه محصول');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

/* ---------- کاربران ---------- */
async function renderUsersSection() {
  const root = document.getElementById('admin-content');
  const res = await api('/admin/api/users');
  if (res.status === 403) { root.innerHTML = forbiddenHTML('users'); return; }
  const users = await res.json();

  if (!users.length) { root.innerHTML = '<div class="admin-empty">هنوز کاربری ثبت‌نام نکرده.</div>'; return; }

  root.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>شماره موبایل</th><th>نام</th><th>شهر</th><th>تاریخ عضویت</th><th></th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr data-id="${u.id}">
              <td>${u.phone}</td>
              <td>${[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
              <td>${u.city || '—'}</td>
              <td>${formatDate(u.createdAt)}</td>
              <td><div class="admin-table-actions">
                <button class="icon-btn user-view-btn" data-id="${u.id}" title="مشاهده و ویرایش کاربر"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn user-delete-btn" data-id="${u.id}" title="حذف کاربر"><i class="fa-solid fa-trash"></i></button>
              </div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  root.querySelectorAll('.user-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = users.find(u => u.id === btn.dataset.id);
      if (user) openUserEditModal(user);
    });
  });

  root.querySelectorAll('.user-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این کاربر حذف بشه؟')) return;
      await api(`/admin/api/users/${btn.dataset.id}`, { method: 'DELETE' });
      renderUsersSection();
    });
  });
}

function openUserEditModal(user) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'user-edit-overlay';
  overlay.innerHTML = `
    <div class="modal glass glass-strong" role="dialog" aria-modal="true" aria-labelledby="user-edit-title">
      <button class="icon-btn modal-close" id="user-edit-close-btn" aria-label="بستن">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
      </button>
      <h3 id="user-edit-title" class="modal-title">اطلاعات کاربر</h3>
      <form id="user-edit-form" style="display:grid;gap:14px;margin-top:16px;">
        <div class="form-group">
          <label>شماره موبایل</label>
          <input type="text" id="user-edit-phone" value="${(user.phone || '').replace(/"/g, '&quot;')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="form-group">
            <label>نام</label>
            <input type="text" id="user-edit-firstname" value="${(user.firstName || '').replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group">
            <label>نام خانوادگی</label>
            <input type="text" id="user-edit-lastname" value="${(user.lastName || '').replace(/"/g, '&quot;')}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="form-group">
            <label>استان</label>
            <input type="text" id="user-edit-province" value="${(user.province || '').replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group">
            <label>شهر</label>
            <input type="text" id="user-edit-city" value="${(user.city || '').replace(/"/g, '&quot;')}">
          </div>
        </div>
        <div class="form-group">
          <label>آدرس</label>
          <input type="text" id="user-edit-address" value="${(user.address || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="form-group">
          <label>کد پستی</label>
          <input type="text" id="user-edit-postalcode" value="${(user.postalCode || '').replace(/"/g, '&quot;')}">
        </div>
        <p style="color:var(--color-text-muted);font-size:13px;">تاریخ عضویت: ${formatDate(user.createdAt)}</p>
        <div style="display:flex;gap:10px;">
          <button type="submit" class="btn btn-primary">ذخیره تغییرات</button>
          <button type="button" class="btn btn-ghost" id="user-edit-cancel">انصراف</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 300); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('user-edit-close-btn').addEventListener('click', close);
  document.getElementById('user-edit-cancel').addEventListener('click', close);
  document.getElementById('user-edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      phone: document.getElementById('user-edit-phone').value.trim(),
      firstName: document.getElementById('user-edit-firstname').value.trim(),
      lastName: document.getElementById('user-edit-lastname').value.trim(),
      province: document.getElementById('user-edit-province').value.trim(),
      city: document.getElementById('user-edit-city').value.trim(),
      address: document.getElementById('user-edit-address').value.trim(),
      postalCode: document.getElementById('user-edit-postalcode').value.trim(),
    };
    const r = await api(`/admin/api/users/${user.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    if (!r.ok) { showToast('ذخیره اطلاعات کاربر با خطا مواجه شد'); return; }
    showToast('اطلاعات کاربر به‌روزرسانی شد');
    close();
    renderUsersSection();
  });
}

/* ---------- کدهای تخفیف ---------- */
function couponStatusLabel(c) {
  if (!c.active) return '<span style="color:var(--color-text-muted);font-size:12px;">غیرفعال</span>';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return '<span style="color:#c0374a;font-size:12px;">منقضی</span>';
  if (c.maxUses !== null && c.usesCount >= c.maxUses) return '<span style="color:#c0374a;font-size:12px;">تمام‌شده</span>';
  return '<span class="admin-badge">فعال</span>';
}

async function renderCouponsSection() {
  const root = document.getElementById('admin-content');
  const res = await api('/admin/api/coupons');
  if (res.status === 403) { root.innerHTML = forbiddenHTML('coupons'); return; }
  const coupons = await res.json();

  root.innerHTML = `
    <div class="admin-header-row"><button class="btn btn-primary" id="coupon-add-btn"><i class="fa-solid fa-plus"></i> افزودن کد تخفیف</button></div>
    <div id="coupon-form-slot"></div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>کد</th><th>نوع</th><th>مقدار</th><th>مخصوص اولین سفارش</th><th>سقف استفاده</th><th>تعداد استفاده‌شده</th><th>انقضا</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>
          ${coupons.map(c => `
            <tr data-id="${c.id}">
              <td><strong>${c.code}</strong>${c.boundPhone ? `<div style="font-size:11px;color:var(--color-text-muted);">مخصوص ${c.boundPhone}</div>` : ''}</td>
              <td>${c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
              <td>${c.type === 'percent' ? c.value + '٪' : formatPrice(c.value)}</td>
              <td>${c.firstOrderOnly ? 'بله' : '—'}</td>
              <td>${c.maxUses ?? 'نامحدود'}</td>
              <td>${c.usesCount}</td>
              <td>${c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
              <td>${couponStatusLabel(c)}</td>
              <td><div class="admin-table-actions">
                <button class="icon-btn coupon-toggle-btn" data-id="${c.id}" data-active="${c.active}" title="${c.active ? 'غیرفعال کردن' : 'فعال کردن'}"><i class="fa-solid ${c.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                <button class="icon-btn coupon-delete-btn" data-id="${c.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
              </div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${!coupons.length ? '<div class="admin-empty">هنوز کد تخفیفی ساخته نشده.</div>' : ''}
    </div>
  `;

  document.getElementById('coupon-add-btn').addEventListener('click', () => {
    document.getElementById('coupon-form-slot').innerHTML = `
      <form id="coupon-form" class="admin-card glass" style="padding:18px;margin-bottom:16px;display:grid;gap:14px;max-width:480px;">
        <div class="form-group">
          <label>کد تخفیف</label>
          <input type="text" id="coupon-code-input" placeholder="مثلاً SUMMER10" required style="text-transform:uppercase;">
        </div>
        <div class="form-group">
          <label>نوع تخفیف</label>
          <select id="coupon-type-input">
            <option value="percent">درصدی</option>
            <option value="fixed">مبلغ ثابت (تومان)</option>
          </select>
        </div>
        <div class="form-group">
          <label>مقدار</label>
          <input type="number" id="coupon-value-input" min="1" required>
        </div>
        <label class="option-chip"><input type="checkbox" id="coupon-first-order-input"> فقط برای اولین سفارش هر شماره</label>
        <div class="form-group">
          <label>سقف کل تعداد استفاده (خالی = نامحدود)</label>
          <input type="number" id="coupon-maxuses-input" min="1">
        </div>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary">ذخیره</button>
          <button type="button" class="btn btn-ghost" id="coupon-form-cancel">انصراف</button>
        </div>
      </form>
    `;
    document.getElementById('coupon-form-cancel').addEventListener('click', () => { document.getElementById('coupon-form-slot').innerHTML = ''; });
    document.getElementById('coupon-form').addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        code: document.getElementById('coupon-code-input').value.trim(),
        type: document.getElementById('coupon-type-input').value,
        value: Number(document.getElementById('coupon-value-input').value),
        firstOrderOnly: document.getElementById('coupon-first-order-input').checked,
        maxUses: document.getElementById('coupon-maxuses-input').value || null,
      };
      const r = await api('/admin/api/coupons', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) { showToast('ذخیره کد تخفیف با خطا مواجه شد (شاید این کد قبلاً ثبت شده)'); return; }
      showToast('کد تخفیف ساخته شد');
      renderCouponsSection();
    });
  });

  root.querySelectorAll('.coupon-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active !== 'true';
      await api(`/admin/api/coupons/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify({ active }) });
      renderCouponsSection();
    });
  });
  root.querySelectorAll('.coupon-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این کد تخفیف حذف بشه؟')) return;
      await api(`/admin/api/coupons/${btn.dataset.id}`, { method: 'DELETE' });
      renderCouponsSection();
    });
  });
}

/* ---------- ظاهر سایت (پریست رنگی + بنر شناور) ---------- */
async function renderAppearanceSection() {
  const root = document.getElementById('admin-content');
  const [settingsRes, bannersRes, heroSlidesRes] = await Promise.all([api('/admin/api/settings'), api('/admin/api/banners'), api('/admin/api/hero-slides')]);
  if (settingsRes.status === 403) { root.innerHTML = forbiddenHTML('appearance'); return; }
  const settings = await settingsRes.json();
  const banners = await bannersRes.json();
  const heroSlides = await heroSlidesRes.json();

  root.innerHTML = `
    <div class="admin-card glass" style="padding:20px;max-width:640px;margin-bottom:20px;">
      <h3 style="margin-bottom:6px;">پالت رنگی سایت</h3>
      <p style="color:var(--color-text-muted);font-size:14px;margin-bottom:18px;">یکی از پریست‌های رنگی زیر رو انتخاب کن؛ روی کل فروشگاه (تم روشن و تیره) اعمال می‌شه.</p>
      <div class="color-preset-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;">
        ${SiteSettingsColorPresetsHTML(settings.colorPreset)}
      </div>
    </div>

    <div class="admin-card glass" style="padding:20px;max-width:640px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h3>بنر شناور بالای سایت</h3>
        <button class="btn btn-primary" id="banner-add-btn"><i class="fa-solid fa-plus"></i> افزودن اسلاید</button>
      </div>
      <p style="color:var(--color-text-muted);font-size:14px;margin-bottom:18px;">اسلایدهای فعال به‌صورت خودکار توی بنر بالای سایت می‌چرخن.</p>
      <div id="banner-form-slot"></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>متن</th><th>لینک</th><th>ترتیب</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>
            ${banners.map(b => `
              <tr data-id="${b.id}">
                <td>${b.text}</td>
                <td>${b.link || '—'}</td>
                <td>${b.order}</td>
                <td>${b.active ? '<span class="admin-badge">فعال</span>' : '<span style="color:var(--color-text-muted);font-size:12px;">غیرفعال</span>'}</td>
                <td><div class="admin-table-actions">
                  <button class="icon-btn banner-edit-btn" data-id="${b.id}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
                  <button class="icon-btn banner-toggle-btn" data-id="${b.id}" data-active="${b.active}" title="${b.active ? 'غیرفعال کردن' : 'فعال کردن'}"><i class="fa-solid ${b.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
                  <button class="icon-btn banner-delete-btn" data-id="${b.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${!banners.length ? '<div class="admin-empty">هنوز اسلایدی برای بنر ساخته نشده.</div>' : ''}
      </div>
    </div>

    <div class="admin-card glass" style="padding:20px;max-width:720px;margin-top:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <h3>هیرو سکشن لندینگ</h3>
        <button class="btn btn-primary" id="hero-slide-add-btn"><i class="fa-solid fa-plus"></i> افزودن اسلاید هیرو</button>
      </div>
      <p style="color:var(--color-text-muted);font-size:14px;margin-bottom:18px;">اسلایدهای فعال به‌ترتیب توی هیرو صفحه‌ی اصلی می‌چرخن؛ هر اسلاید تصویر و متن/دکمه‌ی خودش رو داره. مستقل از بخش «محصولات جدید» است.</p>
      <div id="hero-slide-form-slot"></div>
      <div class="hero-slide-admin-list" id="hero-slide-list">
        ${heroSlides.map((s, i) => `
          <div class="hero-slide-admin-row" data-id="${s.id}">
            <img src="${s.imageUrl}" alt="" class="hero-slide-admin-thumb">
            <div class="hero-slide-admin-info">
              <strong>${s.title || '(بدون عنوان)'}</strong>
              <span>${s.eyebrow || '—'}</span>
            </div>
            <div class="hero-slide-admin-order">
              <button type="button" class="icon-btn hero-slide-move-up-btn" data-id="${s.id}" title="بالاتر" ${i === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
              <button type="button" class="icon-btn hero-slide-move-down-btn" data-id="${s.id}" title="پایین‌تر" ${i === heroSlides.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
            </div>
            <div class="admin-table-actions">
              <button class="icon-btn hero-slide-edit-btn" data-id="${s.id}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn hero-slide-toggle-btn" data-id="${s.id}" data-active="${s.active}" title="${s.active ? 'غیرفعال کردن' : 'فعال کردن'}"><i class="fa-solid ${s.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
              <button class="icon-btn hero-slide-delete-btn" data-id="${s.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `).join('')}
        ${!heroSlides.length ? '<div class="admin-empty">هنوز اسلایدی برای هیرو ساخته نشده — تا وقتی اضافه نکنی، هیرو حالت خالی/پیش‌فرض برند رو نشون می‌ده.</div>' : ''}
      </div>
    </div>
  `;

  root.querySelectorAll('.color-preset-option').forEach(el => {
    el.addEventListener('click', async () => {
      const preset = el.dataset.preset;
      const r = await api('/admin/api/settings', { method: 'PUT', body: JSON.stringify({ colorPreset: preset }) });
      if (!r.ok) { showToast('ذخیره پالت رنگی با خطا مواجه شد'); return; }
      document.documentElement.setAttribute('data-color-preset', preset);
      localStorage.setItem('brand_color_preset_v1', preset);
      showToast('پالت رنگی سایت به‌روزرسانی شد');
      renderAppearanceSection();
    });
  });

  function openBannerForm(banner) {
    const editing = !!banner;
    document.getElementById('banner-form-slot').innerHTML = `
      <form id="banner-form" class="admin-card glass" style="padding:18px;margin-bottom:16px;display:grid;gap:14px;max-width:480px;">
        <div class="form-group">
          <label>متن اسلاید</label>
          <input type="text" id="banner-text-input" placeholder="مثلاً ارسال رایگان برای خریدهای بالای ۲ میلیون تومان" value="${editing ? banner.text.replace(/"/g, '&quot;') : ''}" required>
        </div>
        <div class="form-group">
          <label>لینک (اختیاری)</label>
          <input type="text" id="banner-link-input" placeholder="/pants یا هر آدرسی" value="${editing ? (banner.link || '').replace(/"/g, '&quot;') : ''}">
        </div>
        <div class="form-group">
          <label>ترتیب نمایش (عدد کوچیک‌تر زودتر میاد)</label>
          <input type="number" id="banner-order-input" value="${editing ? banner.order : 0}">
        </div>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary">${editing ? 'ذخیره تغییرات' : 'ذخیره'}</button>
          <button type="button" class="btn btn-ghost" id="banner-form-cancel">انصراف</button>
        </div>
      </form>
    `;
    document.getElementById('banner-form-cancel').addEventListener('click', () => { document.getElementById('banner-form-slot').innerHTML = ''; });
    document.getElementById('banner-form').addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        text: document.getElementById('banner-text-input').value.trim(),
        link: document.getElementById('banner-link-input').value.trim(),
        order: Number(document.getElementById('banner-order-input').value) || 0,
      };
      const r = editing
        ? await api(`/admin/api/banners/${banner.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/admin/api/banners', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) { showToast('ذخیره بنر با خطا مواجه شد'); return; }
      showToast(editing ? 'اسلاید بنر ویرایش شد' : 'اسلاید بنر ساخته شد');
      renderAppearanceSection();
    });
  }

  document.getElementById('banner-add-btn').addEventListener('click', () => openBannerForm(null));

  root.querySelectorAll('.banner-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const banner = banners.find(b => b.id === btn.dataset.id);
      if (banner) openBannerForm(banner);
    });
  });

  root.querySelectorAll('.banner-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active !== 'true';
      await api(`/admin/api/banners/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify({ active }) });
      renderAppearanceSection();
    });
  });
  root.querySelectorAll('.banner-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این اسلاید بنر حذف بشه؟')) return;
      await api(`/admin/api/banners/${btn.dataset.id}`, { method: 'DELETE' });
      renderAppearanceSection();
    });
  });

  /* ---------- مدیریت اسلایدهای هیرو سکشن ---------- */
  function heroImageUploadFieldHTML(fieldId, label, currentUrl) {
    return `
      <div class="form-group">
        <label>${label}</label>
        <div class="admin-image-gallery" id="${fieldId}-grid"></div>
        <input type="file" id="${fieldId}-input" accept="image/png,image/jpeg,image/webp" hidden>
        <button type="button" class="btn btn-ghost" id="${fieldId}-btn"><i class="fa-solid fa-upload"></i> ${currentUrl ? 'تغییر تصویر' : 'آپلود تصویر'}</button>
      </div>
    `;
  }

  function wireHeroImageField(fieldId, initialUrl) {
    let imageUrl = initialUrl || '';
    const grid = document.getElementById(`${fieldId}-grid`);
    const input = document.getElementById(`${fieldId}-input`);
    const btn = document.getElementById(`${fieldId}-btn`);

    function renderThumb() {
      grid.innerHTML = imageUrl ? `
        <div class="admin-image-thumb" data-index="0">
          <img src="${imageUrl}" alt="">
          <button type="button" class="admin-image-remove-btn" id="${fieldId}-remove" title="حذف"><i class="fa-solid fa-xmark"></i></button>
        </div>
      ` : '';
      const removeBtn = document.getElementById(`${fieldId}-remove`);
      if (removeBtn) removeBtn.addEventListener('click', () => { imageUrl = ''; renderThumb(); });
    }
    renderThumb();

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      const res = await api('/admin/api/hero-slides/upload-image', { method: 'POST', body: formData });
      if (!res.ok) { showToast('آپلود عکس با خطا مواجه شد'); return; }
      imageUrl = (await res.json()).url;
      renderThumb();
      input.value = '';
    });

    return () => imageUrl;
  }

  function openHeroSlideForm(slide) {
    const editing = !!slide;
    document.getElementById('hero-slide-form-slot').innerHTML = `
      <form id="hero-slide-form" class="admin-card glass" style="padding:18px;margin-bottom:16px;display:grid;gap:14px;max-width:560px;">
        <div class="form-row">
          ${heroImageUploadFieldHTML('hsf-image', 'تصویر اسلاید (تم روشن) *', editing ? slide.imageUrl : '')}
          ${heroImageUploadFieldHTML('hsf-image-dark', 'تصویر مخصوص تم تیره (اختیاری)', editing ? slide.imageUrlDark : '')}
        </div>
        <div class="form-group"><label>پیش‌عنوان (eyebrow)</label><input type="text" id="hsf-eyebrow" value="${editing ? (slide.eyebrow || '').replace(/"/g, '&quot;') : ''}" placeholder="مثلاً خرید ساده، مطمئن و سریع"></div>
        <div class="form-group"><label>عنوان اصلی</label><input type="text" id="hsf-title" value="${editing ? (slide.title || '').replace(/"/g, '&quot;') : ''}" placeholder="مثلاً لباسی که داستان شما را روایت می‌کند"></div>
        <div class="form-group"><label>زیرعنوان</label><textarea id="hsf-subtitle" rows="2">${editing ? (slide.subtitle || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>متن دکمه (CTA)</label><input type="text" id="hsf-cta-label" value="${editing ? (slide.ctaLabel || '').replace(/"/g, '&quot;') : ''}" placeholder="مثلاً مشاهده محصولات"></div>
          <div class="form-group"><label>لینک دکمه</label><input type="text" id="hsf-cta-link" value="${editing ? (slide.ctaLink || '').replace(/"/g, '&quot;') : ''}" placeholder="#products"></div>
        </div>
        <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="hsf-active" ${!editing || slide.active ? 'checked' : ''}> فعال</label>
        <span class="form-error" id="hsf-error"></span>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary">${editing ? 'ذخیره تغییرات' : 'ذخیره'}</button>
          <button type="button" class="btn btn-ghost" id="hero-slide-form-cancel">انصراف</button>
        </div>
      </form>
    `;

    const getLightUrl = wireHeroImageField('hsf-image', editing ? slide.imageUrl : '');
    const getDarkUrl = wireHeroImageField('hsf-image-dark', editing ? slide.imageUrlDark : '');

    document.getElementById('hero-slide-form-cancel').addEventListener('click', () => { document.getElementById('hero-slide-form-slot').innerHTML = ''; });
    document.getElementById('hero-slide-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errorEl = document.getElementById('hsf-error');
      const imageUrl = getLightUrl();
      if (!imageUrl) { errorEl.textContent = 'آپلود تصویر (تم روشن) اجباریه'; return; }
      const payload = {
        imageUrl,
        imageUrlDark: getDarkUrl() || '',
        eyebrow: document.getElementById('hsf-eyebrow').value.trim(),
        title: document.getElementById('hsf-title').value.trim(),
        subtitle: document.getElementById('hsf-subtitle').value.trim(),
        ctaLabel: document.getElementById('hsf-cta-label').value.trim(),
        ctaLink: document.getElementById('hsf-cta-link').value.trim(),
        active: document.getElementById('hsf-active').checked,
      };
      const r = editing
        ? await api(`/admin/api/hero-slides/${slide.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/admin/api/hero-slides', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) { errorEl.textContent = 'ذخیره اسلاید با خطا مواجه شد'; return; }
      showToast(editing ? 'اسلاید هیرو ویرایش شد' : 'اسلاید هیرو ساخته شد');
      renderAppearanceSection();
    });
  }

  document.getElementById('hero-slide-add-btn').addEventListener('click', () => openHeroSlideForm(null));

  root.querySelectorAll('.hero-slide-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slide = heroSlides.find(s => s.id === btn.dataset.id);
      if (slide) openHeroSlideForm(slide);
    });
  });
  root.querySelectorAll('.hero-slide-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const active = btn.dataset.active !== 'true';
      await api(`/admin/api/hero-slides/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify({ active }) });
      renderAppearanceSection();
    });
  });
  root.querySelectorAll('.hero-slide-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این اسلاید هیرو حذف بشه؟')) return;
      await api(`/admin/api/hero-slides/${btn.dataset.id}`, { method: 'DELETE' });
      renderAppearanceSection();
    });
  });

  async function reorderHeroSlide(id, direction) {
    const ids = heroSlides.map(s => s.id);
    const index = ids.indexOf(id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await api('/admin/api/hero-slides/reorder', { method: 'PUT', body: JSON.stringify({ order: ids }) });
    renderAppearanceSection();
  }
  root.querySelectorAll('.hero-slide-move-up-btn').forEach(btn => {
    btn.addEventListener('click', () => reorderHeroSlide(btn.dataset.id, -1));
  });
  root.querySelectorAll('.hero-slide-move-down-btn').forEach(btn => {
    btn.addEventListener('click', () => reorderHeroSlide(btn.dataset.id, 1));
  });
}

function SiteSettingsColorPresetsHTML(activePreset) {
  return Object.keys(COLOR_PRESET_LABELS).map(key => {
    const swatches = COLOR_PRESET_SWATCHES[key].map(c => `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${c};border:1px solid rgba(0,0,0,.1);"></span>`).join('');
    const active = key === activePreset;
    return `
      <button type="button" class="color-preset-option" data-preset="${key}" style="display:flex;flex-direction:column;gap:10px;align-items:center;padding:16px 10px;border-radius:var(--radius-md);border:2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'};background:var(--color-surface);cursor:pointer;">
        <span style="display:flex;gap:4px;">${swatches}</span>
        <span style="font-size:13px;font-weight:${active ? '700' : '400'};">${COLOR_PRESET_LABELS[key]}${active ? ' ✓' : ''}</span>
      </button>
    `;
  }).join('');
}

/* تجزیه‌ی کد RGB وارد شده توسط ادمین (تنها روش مجاز ثبت رنگ جدید) به کد HEX استاندارد؛
   فرمت‌های قابل قبول: «255,0,0»، «rgb(255,0,0)»، «#FF0000»، «FF0000». نامعتبر => null. */
function parseRgbColorInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const hexMatch = value.match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return `#${hex.toUpperCase()}`;
  }

  const rgbMatch = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
    || value.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.slice(1, 4).map(Number);
    if ([r, g, b].every(n => n >= 0 && n <= 255)) {
      return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    }
  }
  return null;
}

/* ---------- محصولات ---------- */
/* گرید انتخاب رنگ از پالت مشترک (colorPalette، هم ۲۴ رنگ پایه هم رنگ‌های سفارشی قبلی) +
   امکان ساخت رنگ جدید با سلکتور RGB که در پالت هم ذخیره می‌شه. */
function colorSwatchGridHTML(colorPalette, selectedColors) {
  const selectedHexes = (selectedColors || []).map(c => (c.hex || '').toUpperCase());
  return colorPalette.map(c => `
    <label class="color-swatch-chip">
      <input type="checkbox" class="color-swatch-input" value="${c.hex}" data-name="${c.name}" ${selectedHexes.includes(c.hex.toUpperCase()) ? 'checked' : ''}>
      <span class="color-swatch-dot" style="background:${c.hex};"></span>
      ${c.name}
    </label>
  `).join('');
}

function categoryOptionsForPopup(categories) {
  const mains = categories.filter(c => !c.parent);
  return mains.flatMap(main => {
    const children = categories.filter(c => c.parent === main.id);
    return [{ value: main.id, label: main.name }, ...children.map(ch => ({ value: ch.id, label: `${main.name} / ${ch.name}` }))];
  });
}

function productFormHTML(categories, colorPalette, product = null) {
  const sizesChecked = s => product?.sizes?.includes(s) ? 'checked' : '';
  return `
    <div class="admin-form-card" id="product-form-card">
      <h3 style="margin-bottom:16px;">${product ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
      <form id="product-form">
        <input type="hidden" id="pf-id" value="${product?.id || ''}">
        <div class="form-row">
          <div class="form-group"><label>نام محصول *</label><input type="text" id="pf-name" required value="${product?.name || ''}"></div>
          <div class="form-group">
            <label>کد محصول * (حداکثر ۴ رقم)</label>
            <input type="text" id="pf-code" inputmode="numeric" maxlength="4" required value="${product?.code || ''}">
            <span class="form-hint">به‌صورت خودکار پیشنهاد می‌شه؛ در صورت نیاز تا ۴ رقم قابل ویرایش دستیه.</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>دسته‌بندی *</label>
            <input type="text" id="pf-category" readonly required data-popup="list"
              data-popup-options='${JSON.stringify(categoryOptionsForPopup(categories))}'
              data-selected-value="${product?.category || ''}" value="${categories.find(c => c.id === product?.category)?.name || ''}">
          </div>
          <div class="form-group">
            <label>تصاویر محصول * (حداکثر ۱۰ تصویر — تصویر اول، تصویر اصلی/کاور است)</label>
            <div class="admin-image-gallery" id="pf-images-grid"></div>
            <input type="file" id="pf-images-input" accept="image/png,image/jpeg,image/webp" multiple hidden>
            <button type="button" class="btn btn-ghost" id="pf-images-upload-btn"><i class="fa-solid fa-upload"></i> افزودن تصویر</button>
          </div>
        </div>
        <div class="form-group">
          <label>متریال / جنس (اختیاری)</label>
          <input type="text" id="pf-material" placeholder="مثلاً پنبه، استیل، چوب، ..." value="${(product?.material || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="form-group"><label>قیمت پایه (قبل از تخفیف) *</label><input type="text" inputmode="numeric" data-fa-number id="pf-price" required value="${product?.price || ''}"></div>
        <div class="form-group"><label>بج سفارشی (اختیاری — هنگام فعال بودن تخفیف خودکار «تخفیف»، و برای محصول جدید خودکار «جدید» می‌شه)</label><input type="text" id="pf-badge" value="${product?.badge || ''}"></div>
        <div class="form-group">
          <label>توضیحات محصول</label>
          <textarea id="pf-description" dir="rtl" rows="4" placeholder="هر خط یک پاراگراف مستقل در صفحه محصول می‌شه؛ برای پاراگراف جدید Enter بزن...">${product?.description || ''}</textarea>
          <span class="form-hint">هر خط جدا (Enter) به‌عنوان یک پاراگراف مجزا زیر هم در صفحه محصول نمایش داده می‌شه.</span>
        </div>
        <div class="form-group">
          <label>رنگ‌ها</label>
          <div class="color-swatch-grid" id="pf-color-grid">${colorSwatchGridHTML(colorPalette, product?.colors)}</div>
          <div class="color-swatch-add">
            <div class="color-rgb-input-wrap">
              <input type="text" id="pf-new-color-hex" placeholder="کد RGB (مثلاً 255,0,0)">
              <span class="color-rgb-preview" id="pf-new-color-preview"></span>
            </div>
            <input type="text" id="pf-new-color-name" placeholder="نام رنگ جدید (مثلاً یاسی)">
            <button type="button" class="btn btn-ghost" id="pf-color-add-btn"><i class="fa-solid fa-check"></i> تایید و افزودن به پالت</button>
          </div>
        </div>
        <div class="form-group">
          <label>سایزها</label>
          <div class="option-chips">
            ${PRODUCT_SIZES.map(s => `<label class="option-chip"><input type="checkbox" name="pf-size" value="${s}" ${sizesChecked(s)}> ${s}</label>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="pf-instock" ${product?.inStock !== false ? 'checked' : ''}> موجود است</label>
          <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="pf-bestseller" ${product?.bestseller ? 'checked' : ''}> پرطرفدار</label>
          <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="pf-new-arrival" ${product?.isNewArrival ? 'checked' : ''}> افزودن به بخش «محصولات جدید»</label>
        </div>
        <div class="form-group">
          <label>موجودی</label>
          <span class="form-hint">اگر رنگ/سایز انتخاب شده باشه، موجودی به تفکیک هر ترکیب رنگ+سایز تنظیم می‌شه؛ وگرنه همون موجودی کلی زیر ملاکه.</span>
          <div class="variant-grid" id="pf-variant-grid"></div>
          <div class="form-row" id="pf-flat-stock-row">
            <div class="form-group">
              <label>تعداد کل موجودی (اختیاری — برای فعال شدن نوار درصد فروش)</label>
              <input type="text" inputmode="numeric" data-fa-number id="pf-stock-qty" value="${product?.stockQty ?? ''}">
            </div>
            ${product ? `<div class="form-group"><label>تعداد فروخته‌شده تا الان</label><input type="text" value="${product.stockSold || 0}" disabled></div>` : ''}
          </div>
        </div>

        <div class="form-group" style="margin-top:18px; padding-top:14px; border-top:1px solid var(--color-border);">
          <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="pf-discount-enabled" ${product?.discountType ? 'checked' : ''}> این محصول تخفیف خاص داره</label>
          <span class="form-hint">این تخفیف مستقل از کدهای تخفیف عمومیه؛ فقط روی همین محصول اثر می‌ذاره.</span>
        </div>
        <div id="pf-discount-fields" ${product?.discountType ? '' : 'hidden'}>
          <div class="form-row">
            <div class="form-group">
              <label>نوع تخفیف</label>
              <div class="option-chips">
                <label class="option-chip"><input type="radio" name="pf-discount-type" value="percent" ${product?.discountType !== 'fixed' ? 'checked' : ''}> درصدی از قیمت پایه</label>
                <label class="option-chip"><input type="radio" name="pf-discount-type" value="fixed" ${product?.discountType === 'fixed' ? 'checked' : ''}> مبلغ ثابت کسر از قیمت پایه</label>
              </div>
            </div>
            <div class="form-group">
              <label id="pf-discount-value-label">مقدار تخفیف (٪)</label>
              <input type="text" inputmode="numeric" data-fa-number id="pf-discount-value" value="${product?.discountValue ?? ''}">
            </div>
          </div>
          <div class="form-group">
            <span class="form-hint">قیمت نهایی بعد از تخفیف: <strong id="pf-discount-preview">—</strong></span>
          </div>

          <div class="form-group">
            <label>مبنای فعال بودن تخفیف</label>
            <div class="option-chips">
              <label class="option-chip"><input type="radio" name="pf-discount-basis" value="time" ${product?.discountBasis !== 'stock' ? 'checked' : ''}> بر اساس زمان (بازه‌ی تاریخ)</label>
              <label class="option-chip"><input type="radio" name="pf-discount-basis" value="stock" ${product?.discountBasis === 'stock' ? 'checked' : ''}> بر اساس موجودی (سهمیه‌ی اولین خریداران)</label>
            </div>
          </div>

          <div id="pf-discount-time-fields" ${product?.discountBasis === 'stock' ? 'hidden' : ''}>
            <div class="form-group">
              <label>بازه‌ی زمانی (اختیاری)</label>
              <span class="form-hint">اگه بازه‌ای انتخاب نکنی، تخفیف نامحدود فعال می‌مونه تا خودت این تیک رو برداری.</span>
              <div class="option-chips">
                <button type="button" class="option-chip discount-preset-btn" data-days="1">۱ روز</button>
                <button type="button" class="option-chip discount-preset-btn" data-days="3">۳ روز</button>
                <button type="button" class="option-chip discount-preset-btn" data-days="7">۱ هفته</button>
                <button type="button" class="option-chip discount-preset-btn" data-days="30">۱ ماه</button>
                <button type="button" class="option-chip" id="discount-custom-btn">بازه‌ی سفارشی (تاریخ شمسی)</button>
                <button type="button" class="option-chip" id="discount-clear-range-btn">بدون بازه (نامحدود)</button>
              </div>
            </div>
            <div class="form-row" id="pf-discount-custom-range" hidden>
              <div class="form-group">
                <label>از تاریخ</label>
                <input type="text" id="pf-ds" readonly data-popup="jalali-date" placeholder="انتخاب تاریخ" value="${formatJalaliDisplay(product?.discountStartsAt)}" data-iso-value="${product?.discountStartsAt || ''}">
              </div>
              <div class="form-group">
                <label>تا تاریخ</label>
                <input type="text" id="pf-de" readonly data-popup="jalali-date" placeholder="انتخاب تاریخ" value="${formatJalaliDisplay(product?.discountEndsAt)}" data-iso-value="${product?.discountEndsAt || ''}">
              </div>
            </div>
            <span class="form-hint" id="pf-discount-range-hint"></span>
            <input type="hidden" id="pf-discount-start-iso" value="${product?.discountStartsAt || ''}">
            <input type="hidden" id="pf-discount-end-iso" value="${product?.discountEndsAt || ''}">
          </div>

          <div class="form-group" id="pf-discount-stock-fields" ${product?.discountBasis === 'stock' ? '' : 'hidden'}>
            <label>سهمیه‌ی تخفیف (تعداد)</label>
            <span class="form-hint">تخفیف فقط تا وقتی فعاله که تعداد فروخته‌شده‌ی این محصول از این عدد کمتر باشه؛ به محض رسیدن به سهمیه، خودکار غیرفعال می‌شه. برای این حالت حتماً موجودی محصول (بالاتر) رو هم تنظیم کن.</span>
            <input type="text" inputmode="numeric" data-fa-number id="pf-discount-stock-quota" value="${product?.discountStockQuota ?? ''}">
          </div>
        </div>

        <div class="form-group" style="margin-top:18px; padding-top:14px; border-top:1px solid var(--color-border);">
          <label class="option-chip" style="width:fit-content;"><input type="checkbox" id="pf-pickypick-enabled" ${product?.pickyPick?.enabled ? 'checked' : ''}> نمایش در «پیشنهاد استورفرانت به سخت‌پسندها»</label>
        </div>
        <div class="form-group" id="pf-pickypick-quote-group" ${product?.pickyPick?.enabled ? '' : 'hidden'}>
          <label for="pf-pickypick-quote">متن نقل‌قول</label>
          <textarea id="pf-pickypick-quote" rows="2">${product?.pickyPick?.quote || ''}</textarea>
        </div>

        <div style="display:flex; gap:10px; margin-top:16px;">
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> ذخیره</button>
          <button type="button" class="btn btn-ghost" id="product-form-cancel">انصراف</button>
        </div>
      </form>
    </div>
  `;
}

/* آینه‌ی سبک client-side منطق getPublicView سمت سرور — چون endpoint ادمین دیتای خام
   (بدون discountActive محاسبه‌شده) برمی‌گردونه و فرم ویرایش بهش نیاز داره. */
function computeAdminDiscountActive(p) {
  if (!p.discountType || !(p.discountValue > 0)) return false;
  if (p.discountBasis === 'stock') {
    if (!(p.discountStockQuota > 0)) return false;
    const totalSold = p.variants?.length
      ? p.variants.reduce((s, v) => s + (v.stockSold || 0), 0)
      : (p.stockSold || 0);
    return totalSold < p.discountStockQuota;
  }
  const now = new Date();
  const hasDateRange = p.discountStartsAt && p.discountEndsAt;
  return !hasDateRange || (new Date(p.discountStartsAt) <= now && now <= new Date(p.discountEndsAt));
}

async function renderProductsSection() {
  const root = document.getElementById('admin-content');
  const [productsRes, categoriesRes, colorsRes] = await Promise.all([api('/admin/api/products'), api('/admin/api/categories'), api('/admin/api/colors')]);
  if (productsRes.status === 403) { root.innerHTML = forbiddenHTML('products'); return; }
  const products = await productsRes.json();
  const categories = await categoriesRes.json();
  const colorPalette = await colorsRes.json();

  root.innerHTML = `
    <div class="admin-header-row">
      <div class="option-chips">
        <button type="button" class="option-chip active" id="products-tab-products">محصولات</button>
        <button type="button" class="option-chip" id="products-tab-categories">دسته‌بندی‌ها</button>
        <button type="button" class="option-chip" id="products-tab-new-arrivals">محصولات جدید ${products.filter(p => p.isNewArrival).length ? `(${products.filter(p => p.isNewArrival).length})` : ''}</button>
      </div>
      <button class="btn btn-primary" id="product-add-btn"><i class="fa-solid fa-plus"></i> افزودن محصول</button>
    </div>
    <div id="product-form-slot"></div>
    <div id="products-list-view">
    <div id="categories-panel" hidden></div>
    <div id="new-arrivals-panel" hidden></div>
    <div class="admin-table-wrap">
      <div class="admin-list-toolbar">
        <input type="text" id="products-search-input" class="admin-search-input" placeholder="جستجو بر اساس نام یا کد محصول...">
        <input type="text" readonly id="products-sort-trigger" class="admin-sort-trigger"
               data-popup="list"
               data-popup-options='${JSON.stringify([{ value: 'newest', label: 'جدیدترین' }, { value: 'oldest', label: 'قدیمی‌ترین' }])}'
               data-selected-value="newest" value="جدیدترین">
      </div>
      <table class="admin-table">
        <thead><tr><th>تصویر</th><th>نام</th><th>کد</th><th>دسته‌بندی</th><th>متریال</th><th>قیمت</th><th>موجودی</th><th>تخفیف</th><th>سخت‌پسند</th><th></th></tr></thead>
        <tbody id="products-table-body"></tbody>
      </table>
      <div class="pagination-bar" id="products-pagination"></div>
    </div>
    </div>
  `;

  const productsListEl = document.getElementById('products-list-view');
  const categoriesPanelEl = document.getElementById('categories-panel');
  const newArrivalsPanelEl = document.getElementById('new-arrivals-panel');
  const productsTable = productsListEl.querySelector('.admin-table-wrap');
  const addBtn = document.getElementById('product-add-btn');

  /* ---------- جستجو + مرتب‌سازی + صفحه‌بندی لیست محصولات (سمت کلاینت) ---------- */
  const productsListState = { search: '', sort: 'newest', page: 1, pageSize: 10 };

  function productRowHTML(p) {
    const discountActive = computeAdminDiscountActive(p);
    return `
      <tr data-id="${p.id}" class="${p.inStock ? '' : 'is-out-of-stock'}">
        <td><img src="/${(p.images?.[0] || '').replace(/^\//, '')}" alt="" style="width:40px;height:50px;object-fit:contain;background:var(--color-bg-alt);border-radius:6px;"></td>
        <td>${p.name}</td>
        <td>${p.code}</td>
        <td>${categories.find(c => c.id === p.category)?.name || p.category}</td>
        <td>${materialCellHTML(p.material)}</td>
        <td>${formatPrice(p.price)}</td>
        <td>
          ${p.inStock ? '<span class="admin-badge">موجود</span>' : '<span style="color:#c0374a;font-size:12px;">ناموجود</span>'}
          ${p.variants?.length ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">${p.variants.reduce((s, v) => s + (v.stockSold || 0), 0)}/${p.variants.reduce((s, v) => s + (v.stockQty || 0), 0)} فروخته‌شده (${p.variants.length} ترکیب)</div>`
            : (p.stockQty != null ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">${p.stockSold || 0}/${p.stockQty} فروخته‌شده</div>` : '')}
        </td>
        <td>${discountActive ? '<span class="admin-badge">فعال</span>' : (p.discountType ? '<span style="color:var(--color-text-muted);font-size:12px;">تنظیم‌شده</span>' : '—')}</td>
        <td>${p.pickyPick?.enabled ? '<i class="fa-solid fa-star" style="color:var(--color-gold);"></i>' : '—'}</td>
        <td><div class="admin-table-actions">
          <button class="icon-btn product-edit-btn" data-id="${p.id}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
          ${discountActive ? `<button class="icon-btn product-notify-btn" data-id="${p.id}" data-name="${p.name}" title="ارسال پیامک تخفیف"><i class="fa-solid fa-comment-sms"></i></button>` : ''}
          <button class="icon-btn product-delete-btn" data-id="${p.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>
    `;
  }

  function productsPageNumbersWithGaps(current, total) {
    const keep = new Set([1, total, current, current - 1, current + 1]);
    const nums = [...keep].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => { if (i > 0 && n - nums[i - 1] > 1) out.push('gap'); out.push(n); });
    return out;
  }

  function renderProductsTable() {
    const q = productsListState.search.trim().toLowerCase();
    let list = !q ? products : products.filter(p => p.name.toLowerCase().includes(q) || String(p.code).toLowerCase().includes(q));
    list = [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return productsListState.sort === 'oldest' ? ta - tb : tb - ta;
    });

    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / productsListState.pageSize));
    if (productsListState.page > totalPages) productsListState.page = totalPages;
    if (productsListState.page < 1) productsListState.page = 1;
    const start = (productsListState.page - 1) * productsListState.pageSize;
    const pageItems = list.slice(start, start + productsListState.pageSize);

    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = pageItems.length ? pageItems.map(productRowHTML).join('') : `<tr><td colspan="10" class="admin-empty">محصولی پیدا نشد.</td></tr>`;

    const paginationEl = document.getElementById('products-pagination');
    if (totalItems <= productsListState.pageSize) {
      paginationEl.innerHTML = '';
    } else {
      const pageBtnsHTML = productsPageNumbersWithGaps(productsListState.page, totalPages).map(n => n === 'gap'
        ? `<span class="pagination-gap">…</span>`
        : `<button type="button" class="pagination-page-btn ${n === productsListState.page ? 'is-active' : ''}" data-page="${n}">${n}</button>`
      ).join('');
      paginationEl.innerHTML = `
        <div class="pagination-controls">
          <button type="button" class="pagination-nav-btn" id="products-pagination-prev" ${productsListState.page <= 1 ? 'disabled' : ''} aria-label="صفحه قبل">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <div class="pagination-pages">${pageBtnsHTML}</div>
          <button type="button" class="pagination-nav-btn" id="products-pagination-next" ${productsListState.page >= totalPages ? 'disabled' : ''} aria-label="صفحه بعد">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
        </div>
      `;
      paginationEl.querySelectorAll('.pagination-page-btn').forEach(btn => {
        btn.addEventListener('click', () => { productsListState.page = Number(btn.dataset.page); renderProductsTable(); });
      });
      paginationEl.querySelector('#products-pagination-prev').addEventListener('click', () => {
        if (productsListState.page > 1) { productsListState.page -= 1; renderProductsTable(); }
      });
      paginationEl.querySelector('#products-pagination-next').addEventListener('click', () => {
        if (productsListState.page < totalPages) { productsListState.page += 1; renderProductsTable(); }
      });
    }

    tbody.querySelectorAll('.product-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openForm(products.find(p => p.id === btn.dataset.id)));
    });
    tbody.querySelectorAll('.product-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('این محصول حذف بشه؟')) return;
        await api(`/admin/api/products/${btn.dataset.id}`, { method: 'DELETE' });
        renderProductsSection();
      });
    });
    tbody.querySelectorAll('.product-notify-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`پیامک تخفیف «${btn.dataset.name}» به همه‌ی کاربران ثبت‌نامی ارسال بشه؟`)) return;
        const res = await api(`/admin/api/products/${btn.dataset.id}/notify-discount`, { method: 'POST' });
        if (!res.ok) { showToast('ارسال پیامک با خطا مواجه شد'); return; }
        const data = await res.json();
        showToast(`پیامک برای ${data.recipients} کاربر ارسال شد`);
      });
    });
  }

  document.getElementById('products-search-input').addEventListener('input', e => {
    productsListState.search = e.target.value;
    productsListState.page = 1;
    renderProductsTable();
  });
  document.getElementById('products-sort-trigger').addEventListener('popup-select', e => {
    productsListState.sort = e.detail.value;
    productsListState.page = 1;
    renderProductsTable();
  });
  renderProductsTable();

  function deactivateAllProductTabs() {
    document.getElementById('products-tab-products').classList.remove('active');
    document.getElementById('products-tab-categories').classList.remove('active');
    document.getElementById('products-tab-new-arrivals').classList.remove('active');
    productsTable.hidden = true;
    addBtn.hidden = true;
    categoriesPanelEl.hidden = true;
    newArrivalsPanelEl.hidden = true;
    document.getElementById('product-form-slot').innerHTML = '';
  }

  document.getElementById('products-tab-categories').addEventListener('click', async e => {
    deactivateAllProductTabs();
    e.target.classList.add('active');
    categoriesPanelEl.hidden = false;
    await renderCategoriesPanel(categoriesPanelEl, categories);
  });
  document.getElementById('products-tab-products').addEventListener('click', e => {
    deactivateAllProductTabs();
    e.target.classList.add('active');
    productsTable.hidden = false;
    addBtn.hidden = false;
  });
  document.getElementById('products-tab-new-arrivals').addEventListener('click', e => {
    deactivateAllProductTabs();
    e.target.classList.add('active');
    newArrivalsPanelEl.hidden = false;
    renderNewArrivalsPanel(newArrivalsPanelEl, products);
  });

  /* ---------- بخش مدیریتی مستقل «محصولات جدید» — کاملاً جدا از مدیریت هیرو سکشن.
     منبع حقیقتش فیلد isNewArrival (بولین، از فرم محصول) هست، نه یک بج متنی آزاد. ---------- */
  function renderNewArrivalsPanel(panelEl, allProducts) {
    const list = allProducts.filter(p => p.isNewArrival);
    panelEl.innerHTML = `
      <p style="color:var(--color-text-muted);font-size:13px;margin-bottom:14px;">محصولاتی که چک‌باکس «افزودن به بخش محصولات جدید» توی فرمشون فعاله؛ همون‌هایی هستن که توی بخش «محصولات جدید» صفحه‌ی اصلی نمایش داده می‌شن.</p>
      <div class="hero-slide-admin-list">
        ${list.map(p => `
          <div class="hero-slide-admin-row" data-id="${p.id}">
            <img src="/${(p.images?.[0] || '').replace(/^\//, '')}" alt="" class="hero-slide-admin-thumb">
            <div class="hero-slide-admin-info"><strong>${p.name}</strong><span>کد ${p.code}</span></div>
            <div class="admin-table-actions">
              <button class="icon-btn new-arrival-edit-btn" data-id="${p.id}" title="ویرایش کامل محصول"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn new-arrival-remove-btn" data-id="${p.id}" title="حذف از بخش محصولات جدید"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
      ${!list.length ? '<div class="admin-empty">هنوز محصولی به بخش «محصولات جدید» اضافه نشده — از فرم ویرایش محصول، چک‌باکس مربوطه رو فعال کن.</div>' : ''}
    `;

    panelEl.querySelectorAll('.new-arrival-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === btn.dataset.id);
        if (!product) return;
        document.getElementById('products-tab-products').click();
        openForm(product);
      });
    });
    panelEl.querySelectorAll('.new-arrival-remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await api(`/admin/api/products/${btn.dataset.id}`, { method: 'PUT', body: JSON.stringify({ isNewArrival: false }) });
        showToast('از بخش «محصولات جدید» حذف شد');
        renderProductsSection();
      });
    });
  }

  function openForm(product) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('product-form-slot').innerHTML = productFormHTML(categories, colorPalette, product);
    document.getElementById('product-form-cancel').addEventListener('click', () => {
      document.getElementById('product-form-slot').innerHTML = '';
    });

    document.querySelectorAll('#product-form [data-fa-number]').forEach(bindFaNumberInput);

    /* --- کد محصول: حداکثر ۴ رقم عددی؛ برای محصول جدید خودکار پیشنهاد می‌شه --- */
    const codeInput = document.getElementById('pf-code');
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 4);
    });
    if (!product) {
      api('/admin/api/products/next-code').then(r => r.json()).then(data => { if (!codeInput.value) codeInput.value = data.code; });
    }

    /* --- آپلود تصاویر محصول (حداکثر ۱۰ تا — اولی کاور/تصویر اصلیه) --- */
    const MAX_PRODUCT_IMAGES = 10;
    let productImages = product?.images ? [...product.images] : [];
    const imagesGrid = document.getElementById('pf-images-grid');
    const imagesInput = document.getElementById('pf-images-input');
    const imagesUploadBtn = document.getElementById('pf-images-upload-btn');

    function renderImagesGrid() {
      imagesGrid.innerHTML = productImages.map((url, i) => `
        <div class="admin-image-thumb" data-index="${i}">
          <img src="/${url.replace(/^\//, '')}" alt="">
          ${i === 0
            ? '<span class="admin-image-cover-badge">اصلی</span>'
            : `<button type="button" class="admin-image-setmain-btn" data-index="${i}" title="انتخاب به‌عنوان تصویر اصلی"><i class="fa-solid fa-star"></i></button>`
          }
          <button type="button" class="admin-image-remove-btn" data-index="${i}" title="حذف"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `).join('');
      imagesGrid.querySelectorAll('.admin-image-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          productImages.splice(Number(btn.dataset.index), 1);
          renderImagesGrid();
        });
      });
      imagesGrid.querySelectorAll('.admin-image-setmain-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = Number(btn.dataset.index);
          const [main] = productImages.splice(index, 1);
          productImages.unshift(main);
          renderImagesGrid();
        });
      });
      imagesUploadBtn.disabled = productImages.length >= MAX_PRODUCT_IMAGES;
    }
    renderImagesGrid();

    imagesUploadBtn.addEventListener('click', () => imagesInput.click());
    imagesInput.addEventListener('change', async () => {
      const remaining = MAX_PRODUCT_IMAGES - productImages.length;
      if (remaining <= 0) { showToast('حداکثر ۱۰ تصویر برای یک محصول مجاز است'); return; }
      const files = [...imagesInput.files].slice(0, remaining);
      if (!files.length) return;
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const res = await api('/admin/api/products/upload-images', { method: 'POST', body: formData });
      if (!res.ok) { showToast('آپلود تصاویر با خطا مواجه شد'); return; }
      const data = await res.json();
      productImages.push(...data.urls);
      renderImagesGrid();
      imagesInput.value = '';
    });

    /* --- رنگ‌ها: انتخاب از پالت مشترک + افزودن رنگ جدید فقط با تایپ کد RGB (پیش‌نمایش زنده + تایید) --- */
    const colorGrid = document.getElementById('pf-color-grid');
    const newColorHexInput = document.getElementById('pf-new-color-hex');
    const newColorPreview = document.getElementById('pf-new-color-preview');

    newColorHexInput.addEventListener('input', () => {
      const hex = parseRgbColorInput(newColorHexInput.value);
      newColorPreview.style.background = hex || 'transparent';
      newColorPreview.classList.toggle('is-invalid', !hex && newColorHexInput.value.trim() !== '');
    });

    document.getElementById('pf-color-add-btn').addEventListener('click', async () => {
      const hex = parseRgbColorInput(newColorHexInput.value);
      const name = document.getElementById('pf-new-color-name').value.trim();
      if (!hex) { showToast('کد RGB نامعتبر است (مثال: 255,0,0 یا #FF0000)'); return; }
      if (!name) { showToast('یک نام برای رنگ جدید وارد کنید'); return; }
      const res = await api('/admin/api/colors', { method: 'POST', body: JSON.stringify({ name, hex }) });
      if (!res.ok) { showToast('ذخیره رنگ جدید با خطا مواجه شد'); return; }
      const color = await res.json();
      if (!colorPalette.some(c => c.hex.toUpperCase() === color.hex.toUpperCase())) colorPalette.push(color);
      const label = document.createElement('label');
      label.className = 'color-swatch-chip';
      label.innerHTML = `<input type="checkbox" class="color-swatch-input" value="${color.hex}" data-name="${color.name}" checked>
        <span class="color-swatch-dot" style="background:${color.hex};"></span>
        ${color.name}`;
      colorGrid.appendChild(label);
      newColorHexInput.value = '';
      newColorPreview.style.background = 'transparent';
      document.getElementById('pf-new-color-name').value = '';
      updateVariantGrid();
    });

    function getSelectedColors() {
      return [...colorGrid.querySelectorAll('.color-swatch-input:checked')].map(el => ({ id: el.dataset.name, name: el.dataset.name, hex: el.value }));
    }
    function getSelectedSizes() {
      return [...document.querySelectorAll('input[name="pf-size"]:checked')].map(el => el.value);
    }

    /* --- گرید موجودی: به تفکیک هر ترکیب رنگ+سایز انتخاب‌شده --- */
    const variantGridEl = document.getElementById('pf-variant-grid');
    const flatStockRow = document.getElementById('pf-flat-stock-row');
    const existingVariants = product?.variants || [];
    function updateVariantGrid() {
      const colorsPicked = getSelectedColors();
      const sizesPicked = getSelectedSizes();
      if (!colorsPicked.length && !sizesPicked.length) {
        variantGridEl.innerHTML = '';
        flatStockRow.hidden = false;
        return;
      }
      flatStockRow.hidden = true;
      const colorList = colorsPicked.length ? colorsPicked : [{ id: '', name: '', hex: '' }];
      const sizeList = sizesPicked.length ? sizesPicked : [''];
      variantGridEl.innerHTML = colorList.map(c => {
        const rows = sizeList.map(s => {
          const existing = existingVariants.find(v => (v.colorId || '') === c.id && (v.size || '') === s);
          const label = [c.name, s].filter(Boolean).join(' / ') || 'موجودی کلی';
          return `<div class="variant-row" data-color-id="${c.id}" data-size="${s}">
            <span class="variant-row-label">${c.hex ? `<span class="color-swatch-dot" style="background:${c.hex};"></span>` : ''}${label}</span>
            <input type="text" inputmode="numeric" data-fa-number class="variant-qty" value="${existing?.stockQty ?? 0}">
          </div>`;
        }).join('');
        const bulkControl = (c.id && sizeList.length > 1) ? `
          <div class="variant-bulk-apply" data-color-id="${c.id}">
            <span class="color-swatch-dot" style="background:${c.hex};"></span>
            <span class="variant-bulk-apply-label">اعمال یک موجودی به همه‌ی سایزهای «${c.name}»</span>
            <input type="text" inputmode="numeric" data-fa-number class="variant-bulk-qty" placeholder="مثلاً ۱۰">
            <button type="button" class="btn btn-ghost variant-bulk-apply-btn" data-color-id="${c.id}">اعمال به همه</button>
          </div>` : '';
        return `<div class="variant-color-group">${bulkControl}${rows}</div>`;
      }).join('');
      variantGridEl.querySelectorAll('[data-fa-number]').forEach(bindFaNumberInput);
      variantGridEl.querySelectorAll('.variant-bulk-apply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const colorId = btn.dataset.colorId;
          const bulkInput = variantGridEl.querySelector(`.variant-bulk-apply[data-color-id="${colorId}"] .variant-bulk-qty`);
          const value = faNumberValue(bulkInput);
          if (value == null) { showToast('یک مقدار موجودی وارد کنید'); return; }
          variantGridEl.querySelectorAll(`.variant-row[data-color-id="${colorId}"] .variant-qty`).forEach(input => {
            input.value = formatFaNumber(String(value));
          });
          showToast(`موجودی برای همه‌ی سایزهای این رنگ اعمال شد`);
        });
      });
    }
    colorGrid.addEventListener('change', updateVariantGrid);
    document.querySelectorAll('input[name="pf-size"]').forEach(el => el.addEventListener('change', updateVariantGrid));
    updateVariantGrid();

    /* --- تخفیف خاص محصول: یک منبع واحد (نوع + مقدار) که از قیمت پایه کم می‌شه؛
       بازه‌ی زمانی صرفاً اختیاریه (نبودش یعنی تخفیف نامحدود) --- */
    const discountFields = document.getElementById('pf-discount-fields');
    const discountEnabledInput = document.getElementById('pf-discount-enabled');
    const discountValueLabel = document.getElementById('pf-discount-value-label');
    const discountValueInput = document.getElementById('pf-discount-value');
    const discountPreview = document.getElementById('pf-discount-preview');
    const priceInput = document.getElementById('pf-price');

    discountEnabledInput.addEventListener('change', e => {
      discountFields.hidden = !e.target.checked;
      updateDiscountPreview();
    });

    const startIsoInput = document.getElementById('pf-discount-start-iso');
    const endIsoInput = document.getElementById('pf-discount-end-iso');
    const rangeHint = document.getElementById('pf-discount-range-hint');
    const customRangeEl = document.getElementById('pf-discount-custom-range');
    const dsInput = document.getElementById('pf-ds');
    const deInput = document.getElementById('pf-de');

    function updateRangeHint() {
      if (!startIsoInput.value || !endIsoInput.value) { rangeHint.textContent = 'نامحدود (بدون بازه‌ی زمانی)'; return; }
      const s = isoToJalaliParts(startIsoInput.value);
      const en = isoToJalaliParts(endIsoInput.value);
      rangeHint.textContent = `از ${toFaDigits(s.jd)} ${JALALI_MONTH_NAMES[s.jm - 1]} ${toFaDigits(s.jy)} تا ${toFaDigits(en.jd)} ${JALALI_MONTH_NAMES[en.jm - 1]} ${toFaDigits(en.jy)}`;
    }

    function updateDiscountValueLabel() {
      const type = document.querySelector('input[name="pf-discount-type"]:checked')?.value || 'percent';
      discountValueLabel.textContent = type === 'percent' ? 'مقدار تخفیف (٪)' : 'مقدار تخفیف (تومان)';
    }

    function updateDiscountPreview() {
      if (!discountEnabledInput.checked) { discountPreview.textContent = '—'; return; }
      const base = faNumberValue(priceInput) || 0;
      const type = document.querySelector('input[name="pf-discount-type"]:checked')?.value || 'percent';
      const value = faNumberValue(discountValueInput);
      if (!base || !value) { discountPreview.textContent = '—'; return; }
      const finalPrice = Math.max(0, type === 'percent' ? Math.round(base * (1 - value / 100)) : Math.round(base - value));
      discountPreview.textContent = `${formatPrice(finalPrice)} (به‌جای ${formatPrice(base)})`;
    }

    root.querySelectorAll('input[name="pf-discount-type"]').forEach(input => {
      input.addEventListener('change', () => { updateDiscountValueLabel(); updateDiscountPreview(); });
    });
    discountValueInput.addEventListener('input', updateDiscountPreview);
    priceInput.addEventListener('input', updateDiscountPreview);

    const discountTimeFields = document.getElementById('pf-discount-time-fields');
    const discountStockFields = document.getElementById('pf-discount-stock-fields');
    root.querySelectorAll('input[name="pf-discount-basis"]').forEach(input => {
      input.addEventListener('change', () => {
        const isStock = document.querySelector('input[name="pf-discount-basis"]:checked')?.value === 'stock';
        discountTimeFields.hidden = isStock;
        discountStockFields.hidden = !isStock;
      });
    });

    root.querySelectorAll('.discount-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = Number(btn.dataset.days);
        const now = new Date();
        const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        startIsoInput.value = now.toISOString();
        endIsoInput.value = end.toISOString();
        dsInput.value = formatJalaliDisplay(startIsoInput.value);
        dsInput.dataset.isoValue = startIsoInput.value;
        deInput.value = formatJalaliDisplay(endIsoInput.value);
        deInput.dataset.isoValue = endIsoInput.value;
        customRangeEl.hidden = true;
        updateRangeHint();
      });
    });

    document.getElementById('discount-custom-btn').addEventListener('click', () => {
      customRangeEl.hidden = false;
    });

    document.getElementById('discount-clear-range-btn').addEventListener('click', () => {
      startIsoInput.value = '';
      endIsoInput.value = '';
      dsInput.value = ''; dsInput.dataset.isoValue = '';
      deInput.value = ''; deInput.dataset.isoValue = '';
      customRangeEl.hidden = true;
      updateRangeHint();
    });

    dsInput.addEventListener('popup-select', e => {
      startIsoInput.value = e.detail.value;
      updateRangeHint();
    });
    deInput.addEventListener('popup-select', e => {
      endIsoInput.value = e.detail.value;
      updateRangeHint();
    });

    updateDiscountValueLabel();
    updateDiscountPreview();
    updateRangeHint();

    /* --- پیشنهاد سخت‌پسندها --- */
    document.getElementById('pf-pickypick-enabled').addEventListener('change', e => {
      document.getElementById('pf-pickypick-quote-group').hidden = !e.target.checked;
    });

    document.getElementById('product-form').addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('pf-id').value;
      if (!productImages.length) { showToast('لطفاً حداقل یک تصویر برای محصول انتخاب کنید'); return; }
      if (!/^\d{1,4}$/.test(document.getElementById('pf-code').value.trim())) { showToast('کد محصول باید عددی و حداکثر ۴ رقم باشد'); return; }
      const discountEnabled = document.getElementById('pf-discount-enabled').checked;
      if (discountEnabled && !faNumberValue(discountValueInput)) { showToast('برای تخفیف، مقدار تخفیف رو وارد کن'); return; }
      const discountBasis = document.querySelector('input[name="pf-discount-basis"]:checked')?.value || 'time';
      if (discountEnabled && discountBasis === 'stock' && !faNumberValue(document.getElementById('pf-discount-stock-quota'))) { showToast('برای تخفیف بر اساس موجودی، سهمیه رو وارد کن'); return; }
      const colors = getSelectedColors();
      const sizes = getSelectedSizes();
      const variants = [...variantGridEl.querySelectorAll('.variant-row')].map(row => ({
        colorId: row.dataset.colorId || null,
        size: row.dataset.size || null,
        stockQty: faNumberValue(row.querySelector('.variant-qty')) || 0,
        stockSold: (existingVariants.find(v => (v.colorId || '') === row.dataset.colorId && (v.size || '') === row.dataset.size)?.stockSold) || 0,
      }));
      const payload = {
        name: document.getElementById('pf-name').value.trim(),
        code: document.getElementById('pf-code').value.trim(),
        category: document.getElementById('pf-category').dataset.selectedValue || '',
        images: productImages,
        price: faNumberValue(document.getElementById('pf-price')),
        material: document.getElementById('pf-material').value.trim(),
        badge: document.getElementById('pf-badge').value.trim(),
        description: document.getElementById('pf-description').value.trim(),
        colors,
        sizes: sizes.length ? sizes : null,
        variants,
        inStock: document.getElementById('pf-instock').checked,
        stockQty: variants.length ? null : faNumberValue(document.getElementById('pf-stock-qty')),
        bestseller: document.getElementById('pf-bestseller').checked,
        isNewArrival: document.getElementById('pf-new-arrival').checked,
        discountType: discountEnabled ? (document.querySelector('input[name="pf-discount-type"]:checked')?.value || 'percent') : null,
        discountValue: discountEnabled ? faNumberValue(document.getElementById('pf-discount-value')) : null,
        discountBasis: discountEnabled ? discountBasis : 'time',
        discountStartsAt: discountEnabled && discountBasis === 'time' ? (startIsoInput.value || null) : null,
        discountEndsAt: discountEnabled && discountBasis === 'time' ? (endIsoInput.value || null) : null,
        discountStockQuota: discountEnabled && discountBasis === 'stock' ? faNumberValue(document.getElementById('pf-discount-stock-quota')) : null,
        pickyPick: {
          enabled: document.getElementById('pf-pickypick-enabled').checked,
          quote: document.getElementById('pf-pickypick-quote').value.trim(),
        },
      };
      const res = id
        ? await api(`/admin/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/admin/api/products', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { showToast('ذخیره محصول با خطا مواجه شد'); return; }
      showToast('محصول ذخیره شد');
      renderProductsSection();
    });
  }

  document.getElementById('product-add-btn').addEventListener('click', () => openForm(null));
}

/* ---------- دسته‌بندی‌ها (زیرتب داخل بخش محصولات) — افزودن/ویرایش/حذف داینامیک از پنل ادمین ---------- */
function categoryFormHTML(mainCategories, category = null, presetParent = '') {
  const parentOptions = [{ value: '', label: 'دسته‌ی اصلی (بدون والد)' }, ...mainCategories.filter(c => !category || c.id !== category.id).map(c => ({ value: c.id, label: c.name }))];
  const initialParent = category ? (category.parent || '') : presetParent;
  return `
    <form id="category-form" class="admin-form-card" style="max-width:520px;">
      <h3 style="margin-bottom:16px;">${category ? 'ویرایش دسته‌بندی' : (presetParent ? `افزودن زیرمجموعه‌ی «${mainCategories.find(c => c.id === presetParent)?.name || ''}»` : 'افزودن دسته‌بندی جدید')}</h3>
      <input type="hidden" id="cf-id" value="${category?.id || ''}">
      <div class="form-group"><label>نام دسته‌بندی *</label><input type="text" id="cf-name" required value="${category?.name || ''}"></div>
      <div class="form-group">
        <label>شرح کلی (برای صفحه‌ی اختصاصی دسته‌بندی)</label>
        <textarea id="cf-description" rows="3">${category?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>زیرمجموعه‌ی کدام دسته‌ست؟</label>
        <input type="text" id="cf-parent" readonly data-popup="list"
          data-popup-options='${JSON.stringify(parentOptions)}'
          data-selected-value="${initialParent}" value="${parentOptions.find(o => o.value === initialParent)?.label || ''}">
      </div>
      <div class="form-group">
        <label>تصویر</label>
        <div class="admin-image-upload">
          <div class="admin-image-preview" id="cf-image-preview">${category?.image ? `<img src="/${category.image.replace(/^\//, '')}" alt="">` : '<i class="fa-solid fa-image"></i>'}</div>
          <input type="file" id="cf-image-input" accept="image/png,image/jpeg,image/webp" hidden>
          <button type="button" class="btn btn-ghost" id="cf-image-upload-btn"><i class="fa-solid fa-upload"></i> انتخاب تصویر</button>
        </div>
        <input type="hidden" id="cf-image" value="${category?.image || ''}">
      </div>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> ذخیره</button>
        <button type="button" class="btn btn-ghost" id="category-form-cancel">انصراف</button>
      </div>
    </form>
  `;
}

async function renderCategoriesPanel(root, categories) {
  const mainCategories = categories.filter(c => !c.parent);

  root.innerHTML = `
    <div class="admin-header-row"><button class="btn btn-primary" id="category-add-btn"><i class="fa-solid fa-plus"></i> افزودن دسته‌بندی</button></div>
    <div id="category-form-slot"></div>
    <div id="category-tree"></div>
  `;

  function renderTree() {
    document.getElementById('category-tree').innerHTML = mainCategories.map(main => `
      <div class="category-tree-item" data-id="${main.id}">
        <span class="category-tree-item-name"><i class="fa-solid fa-layer-group"></i> ${main.name}</span>
        <span class="admin-table-actions">
          <button class="btn btn-ghost category-add-child-btn" data-id="${main.id}" title="افزودن زیرمجموعه برای این دسته"><i class="fa-solid fa-plus"></i> زیرمجموعه</button>
          <button class="icon-btn category-edit-btn" data-id="${main.id}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn category-delete-btn" data-id="${main.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
        </span>
      </div>
      ${categories.filter(c => c.parent === main.id).map(child => `
        <div class="category-tree-item is-child" data-id="${child.id}">
          <span class="category-tree-item-name"><i class="fa-solid fa-turn-up fa-rotate-90"></i> ${child.name}</span>
          <span class="admin-table-actions">
            <button class="icon-btn category-edit-btn" data-id="${child.id}" title="ویرایش"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn category-delete-btn" data-id="${child.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>
          </span>
        </div>
      `).join('')}
    `).join('') || '<div class="admin-empty">هنوز دسته‌بندی‌ای ثبت نشده.</div>';

    root.querySelectorAll('.category-add-child-btn').forEach(btn => {
      btn.addEventListener('click', () => openCategoryForm(null, btn.dataset.id));
    });
    root.querySelectorAll('.category-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openCategoryForm(categories.find(c => c.id === btn.dataset.id)));
    });
    root.querySelectorAll('.category-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hasChildren = categories.some(c => c.parent === btn.dataset.id);
        if (hasChildren && !confirm('این دسته زیرمجموعه هم داره؛ حذفش زیرمجموعه‌ها رو دسته‌ی اصلی نمی‌کنه (جدا باقی می‌مونن). ادامه بدم؟')) return;
        if (!hasChildren && !confirm('این دسته‌بندی حذف بشه؟')) return;
        const res = await api(`/admin/api/categories/${btn.dataset.id}`, { method: 'DELETE' });
        if (!res.ok) { showToast('حذف دسته‌بندی با خطا مواجه شد'); return; }
        showToast('دسته‌بندی حذف شد');
        renderProductsSection();
      });
    });
  }

  function openCategoryForm(category, presetParent = '') {
    document.getElementById('category-form-slot').innerHTML = categoryFormHTML(mainCategories, category, presetParent);
    document.getElementById('category-form-cancel').addEventListener('click', () => {
      document.getElementById('category-form-slot').innerHTML = '';
    });

    const imageInput = document.getElementById('cf-image-input');
    const imagePreview = document.getElementById('cf-image-preview');
    const imageHidden = document.getElementById('cf-image');
    document.getElementById('cf-image-upload-btn').addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', async () => {
      const file = imageInput.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      const res = await api('/admin/api/products/upload-image', { method: 'POST', body: formData });
      if (!res.ok) { showToast('آپلود تصویر با خطا مواجه شد'); return; }
      const data = await res.json();
      imageHidden.value = data.url;
      imagePreview.innerHTML = `<img src="/${data.url.replace(/^\//, '')}" alt="">`;
    });

    document.getElementById('category-form').addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('cf-id').value;
      const image = document.getElementById('cf-image').value.trim();
      if (!image) { showToast('لطفاً یک تصویر برای دسته‌بندی انتخاب کنید'); return; }
      const payload = {
        name: document.getElementById('cf-name').value.trim(),
        description: document.getElementById('cf-description').value.trim(),
        parent: document.getElementById('cf-parent').dataset.selectedValue || null,
        image,
      };
      if (!id) payload.id = payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9؀-ۿ-]/g, '') || `cat-${Date.now()}`;
      const res = id
        ? await api(`/admin/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/admin/api/categories', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { showToast('ذخیره دسته‌بندی با خطا مواجه شد'); return; }
      showToast('دسته‌بندی ذخیره شد');
      renderProductsSection();
    });
  }

  document.getElementById('category-add-btn').addEventListener('click', () => openCategoryForm(null));
  renderTree();
}

/* ---------- ادمین‌ها ---------- */
async function renderAdminsSection() {
  const root = document.getElementById('admin-content');
  const res = await api('/admin/api/admins');
  if (res.status === 403) { root.innerHTML = forbiddenHTML('admins'); return; }
  const admins = await res.json();
  const SECTIONS = ['users', 'orders', 'products', 'admins', ...(REPORTS_ENABLED_UI ? ['reports'] : [])];

  root.innerHTML = `
    <div class="admin-header-row"><button class="btn btn-primary" id="admin-add-btn"><i class="fa-solid fa-plus"></i> افزودن ادمین</button></div>
    <div id="admin-form-slot"></div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>نام</th><th>دسترسی‌ها</th><th></th></tr></thead>
        <tbody>
          ${admins.map(a => `
            <tr data-id="${a.id}">
              <td>${a.name} ${a.isSuperAdmin ? '<span class="admin-badge">سوپرادمین</span>' : ''}</td>
              <td>${a.isSuperAdmin ? 'همه‌ی بخش‌ها' : (a.permissions.map(p => ADMIN_SECTION_LABELS[p]).join('، ') || '—')}</td>
              <td><div class="admin-table-actions">
                ${!a.isSuperAdmin ? `<button class="icon-btn admin-edit-btn" data-id="${a.id}" title="ویرایش دسترسی"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn admin-delete-btn" data-id="${a.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>` : ''}
              </div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  function permissionChipsHTML(checked = []) {
    return `<div class="permission-grid">${SECTIONS.map(s => `
      <label class="option-chip"><input type="checkbox" name="admin-permission" value="${s}" ${checked.includes(s) ? 'checked' : ''}> ${ADMIN_SECTION_LABELS[s]}</label>
    `).join('')}</div>`;
  }

  function openForm(admin) {
    document.getElementById('admin-form-slot').innerHTML = `
      <div class="admin-form-card">
        <h3 style="margin-bottom:16px;">${admin ? 'ویرایش دسترسی ادمین' : 'ادمین جدید'}</h3>
        <form id="admin-form">
          <div class="form-group"><label>نام *</label><input type="text" id="af-name" required value="${admin?.name || ''}"></div>
          <div class="form-group"><label>دسترسی‌ها</label>${permissionChipsHTML(admin?.permissions || [])}</div>
          <div style="display:flex; gap:10px; margin-top:16px;">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> ذخیره</button>
            <button type="button" class="btn btn-ghost" id="admin-form-cancel">انصراف</button>
          </div>
        </form>
      </div>
    `;
    document.getElementById('admin-form-cancel').addEventListener('click', () => {
      document.getElementById('admin-form-slot').innerHTML = '';
    });
    document.getElementById('admin-form').addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('af-name').value.trim(),
        permissions: [...document.querySelectorAll('input[name="admin-permission"]:checked')].map(el => el.value),
      };
      const res = admin
        ? await api(`/admin/api/admins/${admin.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/admin/api/admins', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { showToast('ذخیره ادمین با خطا مواجه شد'); return; }
      const data = await res.json();
      if (data.token) {
        alert(`ادمین جدید ساخته شد. این توکن رو فقط همین یک‌بار می‌بینی، حتماً برای ادمین ارسالش کن:\n\n${data.token}`);
      } else {
        showToast('دسترسی‌ها به‌روزرسانی شد');
      }
      renderAdminsSection();
    });
  }

  document.getElementById('admin-add-btn').addEventListener('click', () => openForm(null));
  root.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openForm(admins.find(a => a.id === btn.dataset.id)));
  });
  root.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('این ادمین حذف بشه؟')) return;
      const res = await api(`/admin/api/admins/${btn.dataset.id}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); showToast(data.error === 'cannot_delete_last_super_admin' ? 'نمی‌شه آخرین سوپرادمین رو حذف کرد' : 'خطا در حذف'); return; }
      renderAdminsSection();
    });
  });
}

/* ---------- گزارشات (پشت REPORTS_ENABLED — رندرر فقط وقتی enabled باشه در روتر ثبت می‌شه) ---------- */
const REPORT_CHART_INSTANCES = {};
function destroyReportCharts() {
  Object.keys(REPORT_CHART_INSTANCES).forEach(k => { REPORT_CHART_INSTANCES[k].destroy(); delete REPORT_CHART_INSTANCES[k]; });
}

function reportRangePreset(days) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

async function renderReportsSection() {
  const root = document.getElementById('admin-content');
  root.innerHTML = `<div class="admin-empty">در حال بارگذاری گزارشات...</div>`;

  let range = reportRangePreset(30);
  const loginsListState = { page: 1, pageSize: 10 };

  function loginsPageNumbersWithGaps(current, total) {
    const keep = new Set([1, total, current, current - 1, current + 1]);
    const nums = [...keep].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => { if (i > 0 && n - nums[i - 1] > 1) out.push('gap'); out.push(n); });
    return out;
  }

  function renderLoginsTable(rows) {
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / loginsListState.pageSize));
    if (loginsListState.page > totalPages) loginsListState.page = totalPages;
    if (loginsListState.page < 1) loginsListState.page = 1;
    const start = (loginsListState.page - 1) * loginsListState.pageSize;
    const pageItems = rows.slice(start, start + loginsListState.pageSize);

    const tbody = document.getElementById('reports-logins-body');
    tbody.innerHTML = pageItems.length ? pageItems.map(r => `
      <tr><td>${r.phone}</td><td>${toFaDigits(r.loginCount)}</td><td>${formatDate(r.lastLoginAt)}</td></tr>
    `).join('') : '<tr><td colspan="3" class="admin-empty">داده‌ای در این بازه نیست</td></tr>';

    const paginationEl = document.getElementById('reports-logins-pagination');
    if (totalItems <= loginsListState.pageSize) {
      paginationEl.innerHTML = '';
      return;
    }
    const pageBtnsHTML = loginsPageNumbersWithGaps(loginsListState.page, totalPages).map(n => n === 'gap'
      ? `<span class="pagination-gap">…</span>`
      : `<button type="button" class="pagination-page-btn ${n === loginsListState.page ? 'is-active' : ''}" data-page="${n}">${n}</button>`
    ).join('');
    paginationEl.innerHTML = `
      <div class="pagination-controls">
        <button type="button" class="pagination-nav-btn" id="reports-logins-prev" ${loginsListState.page <= 1 ? 'disabled' : ''} aria-label="صفحه قبل">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <div class="pagination-pages">${pageBtnsHTML}</div>
        <button type="button" class="pagination-nav-btn" id="reports-logins-next" ${loginsListState.page >= totalPages ? 'disabled' : ''} aria-label="صفحه بعد">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
      </div>
    `;
    paginationEl.querySelectorAll('.pagination-page-btn').forEach(btn => {
      btn.addEventListener('click', () => { loginsListState.page = Number(btn.dataset.page); renderLoginsTable(rows); });
    });
    paginationEl.querySelector('#reports-logins-prev').addEventListener('click', () => {
      if (loginsListState.page > 1) { loginsListState.page -= 1; renderLoginsTable(rows); }
    });
    paginationEl.querySelector('#reports-logins-next').addEventListener('click', () => {
      if (loginsListState.page < totalPages) { loginsListState.page += 1; renderLoginsTable(rows); }
    });
  }

  async function load() {
    const res = await api(`/admin/api/reports/overview?from=${range.from}&to=${range.to}`);
    if (res.status === 403) { root.innerHTML = forbiddenHTML('reports'); return; }
    if (!res.ok) { root.innerHTML = `<div class="admin-empty">خطا در بارگذاری گزارشات</div>`; return; }
    const data = await res.json();
    loginsListState.page = 1;
    renderContent(data);
  }

  function exportUrl(type) {
    return `/admin/api/reports/${type}/export.xlsx?from=${range.from}&to=${range.to}`;
  }

  function renderContent(data) {
    destroyReportCharts();
    const { visits, logins, purchases, newProductsCount, topProducts } = data;

    root.innerHTML = `
      <div class="report-filters">
        <button class="btn btn-ghost" data-preset="7">۷ روز اخیر</button>
        <button class="btn btn-ghost" data-preset="30">۳۰ روز اخیر</button>
        <button class="btn btn-ghost" data-preset="90">۹۰ روز اخیر</button>
        <input type="date" id="rf-from" value="${range.from}">
        <span>تا</span>
        <input type="date" id="rf-to" value="${range.to}">
        <button class="btn btn-primary" id="rf-apply">اعمال بازه</button>
      </div>

      <div class="report-stats-grid">
        <div class="report-stat-card"><span class="report-stat-label">بازدید کل</span><span class="report-stat-value">${toFaDigits(visits.totalViews)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">بازدیدکننده‌ی یکتا</span><span class="report-stat-value">${toFaDigits(visits.totalUniqueVisitors)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">ورود کاربران</span><span class="report-stat-value">${toFaDigits(logins.totalLogins)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">مجموع سفارشات پرداخت‌شده</span><span class="report-stat-value">${toFaDigits(purchases.totalOrders)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">مجموع فروش</span><span class="report-stat-value">${formatPrice(purchases.totalRevenue)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">خریداران یکتا</span><span class="report-stat-value">${toFaDigits(purchases.uniqueBuyers)}</span></div>
        <div class="report-stat-card"><span class="report-stat-label">محصولات جدید در بازه</span><span class="report-stat-value">${toFaDigits(newProductsCount)}</span></div>
      </div>

      <div class="report-chart-card">
        <div class="report-section-header"><h3>بازدید و ورود روزانه</h3><a class="btn btn-ghost" href="${exportUrl('visits')}"><i class="fa-solid fa-file-excel"></i> خروجی اکسل بازدید</a></div>
        <div class="report-chart-canvas-wrap"><canvas id="rc-visits"></canvas></div>
      </div>

      <div class="report-chart-card">
        <div class="report-section-header"><h3>سفارشات و فروش روزانه</h3><a class="btn btn-ghost" href="${exportUrl('purchases')}"><i class="fa-solid fa-file-excel"></i> خروجی اکسل خریداران</a></div>
        <div class="report-chart-canvas-wrap"><canvas id="rc-purchases"></canvas></div>
      </div>

      <div class="report-chart-card">
        <div class="report-section-header"><h3>پرفروش‌ترین محصولات</h3><a class="btn btn-ghost" href="${exportUrl('top-products')}"><i class="fa-solid fa-file-excel"></i> خروجی اکسل</a></div>
        <div class="report-chart-canvas-wrap"><canvas id="rc-top-products"></canvas></div>
      </div>

      <div class="report-chart-card">
        <div class="report-section-header"><h3>تخفیف‌های فعال و باقی‌مانده</h3><a class="btn btn-ghost" href="${exportUrl('discounts')}"><i class="fa-solid fa-file-excel"></i> خروجی اکسل</a></div>
        <div id="rf-discounts-slot"><div class="admin-empty">در حال بارگذاری...</div></div>
      </div>

      <div class="report-chart-card">
        <div class="report-section-header">
          <h3>ورودهای اخیر کاربران</h3>
          <div style="display:flex;align-items:center;gap:8px;">
            <select id="reports-logins-pagesize" class="admin-select-sm">
              <option value="10">۱۰ ردیف</option>
              <option value="20">۲۰ ردیف</option>
              <option value="30">۳۰ ردیف</option>
            </select>
            <a class="btn btn-ghost" href="${exportUrl('logins')}"><i class="fa-solid fa-file-excel"></i> خروجی اکسل</a>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>شماره تلفن</th><th>تعداد ورود</th><th>آخرین ورود</th></tr></thead>
            <tbody id="reports-logins-body"></tbody>
          </table>
        </div>
        <div class="pagination-bar" id="reports-logins-pagination"></div>
      </div>
    `;

    root.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => { range = reportRangePreset(Number(btn.dataset.preset)); load(); });
    });
    document.getElementById('rf-apply').addEventListener('click', () => {
      const from = document.getElementById('rf-from').value;
      const to = document.getElementById('rf-to').value;
      if (!from || !to) { showToast('بازه‌ی تاریخ رو کامل انتخاب کن'); return; }
      range = { from, to };
      load();
    });

    const pageSizeSelect = document.getElementById('reports-logins-pagesize');
    pageSizeSelect.value = String(loginsListState.pageSize);
    pageSizeSelect.addEventListener('change', () => {
      loginsListState.pageSize = Number(pageSizeSelect.value);
      loginsListState.page = 1;
      renderLoginsTable(logins.rows);
    });
    renderLoginsTable(logins.rows);

    const dayLabels = visits.daily.map(d => formatJalaliDisplay(d.day));
    REPORT_CHART_INSTANCES.visits = new Chart(document.getElementById('rc-visits'), {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [
          { label: 'بازدید کل', data: visits.daily.map(d => d.views), borderColor: '#7c4dff', backgroundColor: 'rgba(124,77,255,.15)', tension: .3, fill: true },
          { label: 'بازدیدکننده‌ی یکتا', data: visits.daily.map(d => d.uniqueVisitors), borderColor: '#ff5fa8', backgroundColor: 'rgba(255,95,168,.12)', tension: .3, fill: true },
          { label: 'ورود کاربران', data: logins.daily.map(d => d.count), borderColor: '#12946b', backgroundColor: 'rgba(18,148,107,.12)', tension: .3, fill: true },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });

    const purchaseDayLabels = purchases.daily.map(d => formatJalaliDisplay(d.day));
    REPORT_CHART_INSTANCES.purchases = new Chart(document.getElementById('rc-purchases'), {
      type: 'bar',
      data: {
        labels: purchaseDayLabels,
        datasets: [
          { label: 'تعداد سفارش', data: purchases.daily.map(d => d.orders), backgroundColor: '#ffb84d', yAxisID: 'y', barPercentage: 0.25, categoryPercentage: 0.4, maxBarThickness: 10 },
          { label: 'فروش (تومان)', data: purchases.daily.map(d => d.revenue), backgroundColor: '#7c4dff', yAxisID: 'y1', type: 'line', borderColor: '#7c4dff' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } },
      },
    });

    REPORT_CHART_INSTANCES.topProducts = new Chart(document.getElementById('rc-top-products'), {
      type: 'bar',
      data: {
        labels: topProducts.map(p => p.name),
        datasets: [{ label: 'تعداد فروخته‌شده', data: topProducts.map(p => p.qtySold), backgroundColor: '#ff5fa8', barPercentage: 0.25, categoryPercentage: 0.4, maxBarThickness: 10 }],
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });

    loadDiscounts();
  }

  async function loadDiscounts() {
    const slot = document.getElementById('rf-discounts-slot');
    if (!slot) return;
    const res = await api('/admin/api/reports/discounts');
    if (!res.ok) { slot.innerHTML = '<div class="admin-empty">خطا در بارگذاری</div>'; return; }
    const rows = await res.json();
    slot.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>کد</th><th>نام محصول</th><th>نوع</th><th>مقدار</th><th>وضعیت</th><th>باقی‌مانده</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(p => `
              <tr>
                <td>${p.code}</td><td>${p.name}</td>
                <td>${p.discountType === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                <td>${p.discountType === 'percent' ? toFaDigits(p.discountValue) + '٪' : formatPrice(p.discountValue)}</td>
                <td>${p.discountActive ? '<span class="admin-badge">فعال</span>' : 'غیرفعال'}</td>
                <td>${p.remainingLabel}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="admin-empty">هیچ محصول تخفیف‌داری وجود نداره</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  load();
}

/* ---------- راه‌اندازی ---------- */
async function init() {
  initTheme();
  initColorPreset();
  initLoginPage();

  const admin = await initAdminShell();
  if (!admin) return; // صفحه‌ی لاگین یا ریدایرکت در حال انجام

  initAdminMobileMenu();
  initAdminRouter();
}

/* ---------- منوی همبرگری موبایل (سایدبار به‌صورت درور روی صفحات باریک) ---------- */
function initAdminMobileMenu() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-sidebar-overlay');
  const openBtn = document.getElementById('admin-menu-toggle-btn');
  const closeBtn = document.getElementById('admin-sidebar-close-btn');
  if (!sidebar || !overlay || !openBtn || !closeBtn) return;

  const open = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
  sidebar.querySelectorAll('.admin-nav-link').forEach(link => link.addEventListener('click', close));
}

document.addEventListener('DOMContentLoaded', init);
