'use strict';

/* ابزار داخلی بکاپ/ریستور دیتابیس — کاملاً مستقل از script.js/admin.js.
   احراز هویت: توکن در sessionStorage همین تب نگه داشته می‌شه (نه کوکی/سشن سرور) و روی هر
   درخواست به API به‌صورت هدر X-Backup-Token فرستاده می‌شه. با بستن تب، دوباره باید وارد بشی. */
(function () {
  const API_BASE = '/dev/api/db-backup';
  const TOKEN_KEY = 'sf_db_backup_token';

  const loginWrap = document.getElementById('db-backup-login-wrap');
  const loginForm = document.getElementById('db-backup-login-form');
  const loginTokenInput = document.getElementById('db-backup-token-input');
  const loginError = document.getElementById('db-backup-login-error');
  const page = document.getElementById('db-backup-page');
  const statusEl = document.getElementById('db-backup-status');
  const countEl = document.getElementById('db-backup-count');
  const listEl = document.getElementById('db-backup-list');
  const createBtn = document.getElementById('db-backup-create-btn');
  const restoreBtn = document.getElementById('db-backup-restore-btn');
  const restoreInput = document.getElementById('db-backup-restore-input');

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function showStatus(message, type) {
    statusEl.textContent = message || '';
    statusEl.className = 'db-backup-status' + (type ? ' ' + type : '');
  }

  function showLoginGate() {
    loginWrap.hidden = false;
    page.hidden = true;
  }

  function showPage() {
    loginWrap.hidden = true;
    page.hidden = false;
  }

  async function apiFetch(path, options = {}) {
    const headers = Object.assign({}, options.headers, { 'X-Backup-Token': getToken() });
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    if (res.status === 401) {
      clearToken();
      showLoginGate();
      throw new Error('توکن نامعتبر است، دوباره وارد شوید.');
    }
    return res;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' بایت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' کیلوبایت';
    return (bytes / (1024 * 1024)).toFixed(2) + ' مگابایت';
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
  }

  async function downloadBackup(fileName) {
    const res = await apiFetch('/download/' + encodeURIComponent(fileName));
    if (!res.ok) throw new Error('دانلود بکاپ ناموفق بود.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderList(backups, maxBackups) {
    countEl.textContent = `${backups.length} از حداکثر ${maxBackups} بکاپ نگهداری‌شده`;
    if (!backups.length) {
      listEl.innerHTML = '<div class="db-backup-empty">هنوز هیچ بکاپی گرفته نشده.</div>';
      return;
    }
    listEl.innerHTML = '';
    for (const backup of backups) {
      const row = document.createElement('div');
      row.className = 'db-backup-row';
      row.innerHTML = `
        <div class="db-backup-row-info">
          <div class="db-backup-row-name">${backup.fileName}</div>
          <div class="db-backup-row-meta">${formatDate(backup.createdAt)} — ${formatBytes(backup.sizeBytes)}</div>
        </div>
        <div class="db-backup-row-actions">
          <button type="button" class="icon-btn" title="دانلود" data-action="download"><i class="fa-solid fa-download"></i></button>
          <button type="button" class="icon-btn" title="حذف" data-action="delete" style="color:#c0374a;"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      row.querySelector('[data-action="download"]').addEventListener('click', () => {
        downloadBackup(backup.fileName).catch(err => showStatus(err.message, 'error'));
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (!confirm(`بکاپ «${backup.fileName}» حذف بشه؟ این کار برگشت‌ناپذیره.`)) return;
        apiFetch('/' + encodeURIComponent(backup.fileName), { method: 'DELETE' })
          .then(res => res.json())
          .then(data => {
            if (data.error) throw new Error('حذف ناموفق بود.');
            renderList(data.backups, maxBackups);
            showStatus('بکاپ حذف شد.', 'success');
          })
          .catch(err => showStatus(err.message, 'error'));
      });
      listEl.appendChild(row);
    }
  }

  async function refreshList() {
    const res = await apiFetch('/list');
    const data = await res.json();
    renderList(data.backups, data.maxBackups);
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const token = loginTokenInput.value.trim();
    loginError.textContent = '';
    if (!token) return;
    try {
      const res = await fetch(API_BASE + '/verify', {
        method: 'POST',
        headers: { 'X-Backup-Token': token },
      });
      if (!res.ok) {
        loginError.textContent = 'توکن نادرست است.';
        return;
      }
      setToken(token);
      showPage();
      showStatus('');
      await refreshList();
    } catch {
      loginError.textContent = 'خطا در ارتباط با سرور.';
    }
  });

  createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    showStatus('در حال ساخت بکاپ کامل — بسته به حجم دیتابیس ممکنه کمی طول بکشه...', '');
    try {
      const res = await apiFetch('/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ساخت بکاپ ناموفق بود.');
      await downloadBackup(data.backup.fileName);
      showStatus(`بکاپ «${data.backup.fileName}» ساخته و دانلود شد.`, 'success');
      await refreshList();
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      createBtn.disabled = false;
    }
  });

  restoreBtn.addEventListener('click', () => restoreInput.click());

  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files[0];
    restoreInput.value = '';
    if (!file) return;
    const confirmed = confirm(
      `با ریستور فایل «${file.name}»، تمام اطلاعات فعلی دیتابیس کامل جایگزین می‌شه و این کار برگشت‌ناپذیره.\n` +
      'مطمئنی می‌خوای ادامه بدی؟'
    );
    if (!confirmed) return;

    restoreBtn.disabled = true;
    showStatus('در حال ریستور کامل دیتابیس — تا پایان عملیات صفحه رو نبند...', '');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/restore', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'ریستور ناموفق بود.');
      showStatus('دیتابیس با موفقیت از روی فایل بکاپ ریستور شد.', 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      restoreBtn.disabled = false;
    }
  });

  const savedToken = getToken();
  if (savedToken) {
    apiFetch('/list')
      .then(async res => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        showPage();
        renderList(data.backups, data.maxBackups);
      })
      .catch(() => showLoginGate());
  } else {
    showLoginGate();
  }
})();
