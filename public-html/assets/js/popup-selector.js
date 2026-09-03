'use strict';

/* =========================================================
   Storefront — Popup Selector
   جایگزین عمومی برای <select>/<input type="date"> در کل پروژه:
   - data-popup="list"          : لیست ساده (گزینه‌ها از data-popup-options، JSON آرایه‌ی {value,label})
   - data-popup="province"/"city": استان/شهر (دیتای ایران از assets/data/data.json)
   - data-popup="jalali-date"    : تقویم شمسی (با کتابخانه‌ی jalaali.min.js)
   انتخاب نهایی با رویداد سفارشی «popup-select» روی trigger پخش می‌شود:
   trigger.addEventListener('popup-select', e => e.detail.value / e.detail.label)
   ========================================================= */

const JALALI_WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const JALALI_MONTH_NAMES_PS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function toFaDigits(value) {
  return String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

class PopupSelector {
  constructor() {
    this.activePopup = null;
    this.activeTrigger = null;
    this.provinceCityData = null;
    this.jalaliNav = { jy: null, jm: null };
    this.init();
  }

  init() {
    this.loadProvinceCityData();

    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-popup]');
      if (trigger) {
        if (trigger.disabled) return;
        e.preventDefault();
        this.openPopup(trigger);
      } else if (this.activePopup && !this.activePopup.contains(e.target) && this.activeTrigger !== e.target) {
        this.closePopup();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.activePopup) this.closePopup();
    });

    window.addEventListener('resize', () => {
      if (this.activePopup) this.positionPopup();
    });
  }

  async loadProvinceCityData() {
    try {
      const res = await fetch('/assets/data/data.json');
      const data = await res.json();
      const provinces = {};
      data.provinces.forEach(p => { provinces[p.name] = p.cities; });
      this.provinceCityData = provinces;
    } catch (err) {
      this.provinceCityData = {};
    }
  }

  getListOptions(trigger) {
    try {
      return JSON.parse(trigger.getAttribute('data-popup-options') || '[]');
    } catch (err) {
      return [];
    }
  }

  getProvinceOptions() {
    if (!this.provinceCityData) return [];
    return Object.keys(this.provinceCityData).map(name => ({ value: name, label: name }));
  }

  getCityOptions(trigger) {
    if (!this.provinceCityData) return [];
    const provinceSelector = trigger.getAttribute('data-province-target');
    const provinceInput = provinceSelector ? document.querySelector(provinceSelector) : null;
    const province = provinceInput ? provinceInput.value : '';
    if (!province || !this.provinceCityData[province]) return [];
    return this.provinceCityData[province].map(city => ({ value: city, label: city }));
  }

  openPopup(trigger) {
    if (this.activePopup) this.closePopup();
    this.activeTrigger = trigger;
    const type = trigger.getAttribute('data-popup');

    if (type === 'city') {
      const provinceSelector = trigger.getAttribute('data-province-target');
      const provinceInput = provinceSelector ? document.querySelector(provinceSelector) : null;
      if (!provinceInput || !provinceInput.value) {
        const original = trigger.placeholder;
        trigger.placeholder = 'ابتدا استان را انتخاب کنید';
        setTimeout(() => { if (trigger.placeholder === 'ابتدا استان را انتخاب کنید') trigger.placeholder = original; }, 2000);
        return;
      }
    }

    this.createPopup(type, trigger);
    this.positionPopup();
    trigger.classList.add('popup-active');
  }

  createPopup(type, trigger) {
    const popup = document.createElement('div');
    popup.className = 'popup-selector';
    popup.setAttribute('role', 'listbox');
    document.body.appendChild(popup);
    this.activePopup = popup;

    if (type === 'jalali-date') {
      this.createJalaliDatePopup(popup, trigger);
      return;
    }

    let options = [];
    if (type === 'province') options = this.getProvinceOptions();
    else if (type === 'city') options = this.getCityOptions(trigger);
    else options = this.getListOptions(trigger);

    if (options.length > 6) {
      const search = document.createElement('input');
      search.type = 'text';
      search.className = 'popup-search';
      search.placeholder = 'جستجو...';
      search.addEventListener('input', e => this.filterOptions(e.target.value, popup));
      popup.appendChild(search);
      setTimeout(() => search.focus(), 50);
    }

    const list = document.createElement('ul');
    list.className = 'popup-options';
    if (!options.length) {
      const empty = document.createElement('li');
      empty.className = 'popup-empty';
      empty.textContent = 'موردی یافت نشد';
      list.appendChild(empty);
    }
    options.forEach(option => {
      const li = document.createElement('li');
      li.className = 'popup-option';
      li.setAttribute('data-value', option.value);
      li.textContent = option.label;
      if (String(trigger.dataset.selectedValue || '') === String(option.value)) li.classList.add('selected');
      li.addEventListener('click', () => this.selectOption(option, type));
      list.appendChild(li);
    });
    popup.appendChild(list);
  }

  filterOptions(query, popup) {
    const q = query.toLowerCase();
    popup.querySelectorAll('.popup-option').forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  selectOption(option, type) {
    const trigger = this.activeTrigger;
    if (!trigger) return;
    if (trigger.tagName === 'INPUT') trigger.value = option.label;
    else trigger.textContent = option.label;
    trigger.dataset.selectedValue = option.value;

    if (type === 'province') {
      const dependentCity = trigger.getAttribute('data-city-target');
      if (dependentCity) {
        const cityInput = document.querySelector(dependentCity);
        if (cityInput) { cityInput.value = ''; cityInput.dataset.selectedValue = ''; }
      }
    }

    trigger.dispatchEvent(new CustomEvent('popup-select', { detail: { type, value: option.value, label: option.label } }));
    this.closePopup();
  }

  /* ---------- تقویم شمسی ---------- */
  createJalaliDatePopup(popup, trigger) {
    popup.classList.add('popup-jalali-date');

    let jy, jm, jd;
    const isoValue = trigger.dataset.isoValue || '';
    if (isoValue) {
      const d = new Date(isoValue);
      const j = window.jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      jy = j.jy; jm = j.jm; jd = j.jd;
    } else {
      const now = new Date();
      const j = window.jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
      jy = j.jy; jm = j.jm; jd = null;
    }
    this.jalaliNav = { jy, jm };
    this.jalaliSelectedDay = jd;
    this.renderJalaliCalendar(popup, trigger);
  }

  renderJalaliCalendar(popup, trigger) {
    popup.innerHTML = '';
    const { jy, jm } = this.jalaliNav;

    const header = document.createElement('div');
    header.className = 'popup-jalali-header';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'popup-jalali-nav-btn';
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    prevBtn.addEventListener('click', () => {
      this.jalaliNav.jm -= 1;
      if (this.jalaliNav.jm < 1) { this.jalaliNav.jm = 12; this.jalaliNav.jy -= 1; }
      this.renderJalaliCalendar(popup, trigger);
    });

    const title = document.createElement('div');
    title.className = 'popup-jalali-title';
    title.textContent = `${JALALI_MONTH_NAMES_PS[jm - 1]} ${toFaDigits(jy)}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'popup-jalali-nav-btn';
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    nextBtn.addEventListener('click', () => {
      this.jalaliNav.jm += 1;
      if (this.jalaliNav.jm > 12) { this.jalaliNav.jm = 1; this.jalaliNav.jy += 1; }
      this.renderJalaliCalendar(popup, trigger);
    });

    header.appendChild(nextBtn);
    header.appendChild(title);
    header.appendChild(prevBtn);
    popup.appendChild(header);

    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = 'popup-jalali-weekdays';
    JALALI_WEEKDAY_LABELS.forEach(label => {
      const cell = document.createElement('span');
      cell.textContent = label;
      weekdaysRow.appendChild(cell);
    });
    popup.appendChild(weekdaysRow);

    const grid = document.createElement('div');
    grid.className = 'popup-jalali-grid';

    const firstDayGregorian = window.jalaali.toGregorian(jy, jm, 1);
    const firstJsDay = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd).getDay();
    const leadingBlanks = (firstJsDay + 1) % 7;
    const monthLength = window.jalaali.jalaaliMonthLength(jy, jm);

    const today = new Date();
    const todayJalali = window.jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());

    for (let i = 0; i < leadingBlanks; i += 1) {
      const blank = document.createElement('span');
      blank.className = 'popup-jalali-day popup-jalali-day-blank';
      grid.appendChild(blank);
    }

    for (let day = 1; day <= monthLength; day += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'popup-jalali-day';
      cell.textContent = toFaDigits(day);
      if (jy === todayJalali.jy && jm === todayJalali.jm && day === todayJalali.jd) cell.classList.add('is-today');
      if (jy === this.jalaliNav.jy && jm === this.jalaliNav.jm && day === this.jalaliSelectedDay) cell.classList.add('selected');
      cell.addEventListener('click', () => this.selectJalaliDay(jy, jm, day, trigger));
      grid.appendChild(cell);
    }

    popup.appendChild(grid);
  }

  selectJalaliDay(jy, jm, jd, trigger) {
    const g = window.jalaali.toGregorian(jy, jm, jd);
    const isoValue = new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0).toISOString();
    const label = `${toFaDigits(jd)} ${JALALI_MONTH_NAMES_PS[jm - 1]} ${toFaDigits(jy)}`;

    trigger.value = label;
    trigger.dataset.isoValue = isoValue;
    trigger.dataset.selectedValue = isoValue;
    trigger.dispatchEvent(new CustomEvent('popup-select', { detail: { type: 'jalali-date', value: isoValue, label } }));
    this.closePopup();
  }

  positionPopup() {
    if (!this.activePopup || !this.activeTrigger) return;
    this.activePopup.style.left = '';
    this.activePopup.style.top = '';
    this.activePopup.style.width = '';

    const triggerRect = this.activeTrigger.getBoundingClientRect();
    const popupRect = this.activePopup.getBoundingClientRect();

    this.activePopup.style.top = `${triggerRect.bottom + window.scrollY}px`;
    this.activePopup.style.left = `${triggerRect.left + window.scrollX}px`;
    if (!this.activePopup.classList.contains('popup-jalali-date')) {
      this.activePopup.style.width = `${Math.max(triggerRect.width, 180)}px`;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (triggerRect.bottom + popupRect.height > viewportHeight) {
      this.activePopup.style.top = `${triggerRect.top + window.scrollY - popupRect.height}px`;
    }
    if (triggerRect.left + popupRect.width > viewportWidth) {
      this.activePopup.style.left = `${viewportWidth - popupRect.width - 10}px`;
    }
    if (triggerRect.left < 0) {
      this.activePopup.style.left = '10px';
    }
  }

  closePopup() {
    if (this.activeTrigger) this.activeTrigger.classList.remove('popup-active');
    if (this.activePopup) this.activePopup.remove();
    this.activePopup = null;
    this.activeTrigger = null;
  }
}

document.addEventListener('DOMContentLoaded', () => { window.popupSelector = new PopupSelector(); });
