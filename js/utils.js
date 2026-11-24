// Shared helpers: DOM, formatting, validation, icons, toasts, dialogs, sound.
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const CATEGORIES = ['Science', 'Technology', 'Politics', 'Culture', 'Conflict', 'Nature', 'Economy', 'Personal', 'Other'];

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const currentYear = () => new Date().getFullYear();
export const clampYear = (y) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(Number(y)) || currentYear()));
export const isValidYear = (v) => /^\d{4}$/.test(String(v).trim()) && Number(v) >= MIN_YEAR && Number(v) <= MAX_YEAR;
export const isHttpUrl = (v) => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
export const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Escapes text and wraps case-insensitive matches of q in <mark>.
export function highlight(text, q) {
  if (!q) return esc(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');
}

export const eraOf = (year) => (year < currentYear() ? 'past' : year > currentYear() ? 'future' : 'present');
export function yearDiffLabel(year) {
  const d = year - currentYear();
  if (d === 0) return 'The present year';
  return `${plural(Math.abs(d), 'year')} ${d < 0 ? 'in the past' : 'into the future'}`;
}
export const fmtDateTime = (ts) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
  compare: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 2v20"/>',
  archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/>',
  swap: '<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>',
  rocket: '<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2M12 15l-3-3a22 22 0 0 1 2-4 12 12 0 0 1 11-5c0 3-1 8-5 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.5-3 2-4c1.6-1 5 0 5 0M12 15v5s3-.5 4-2c1-1.6 0-5 0-5"/>',
};
export function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}
export const fillIcons = (root = document) => $$('[data-icon]', root).forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

export function emptyState({ ic = 'clock', title, text, action = '' }) {
  return `<div class="empty">${icon(ic, 40)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

export function toast(message, type = 'info') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3600);
}

export function confirmDialog({ title, text, confirmLabel = 'Confirm', danger = true }) {
  const dlg = document.getElementById('confirm-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(text));
  return new Promise((resolve) => {
    $('#confirm-title', dlg).textContent = title;
    $('#confirm-text', dlg).textContent = text;
    const ok = $('#confirm-ok', dlg);
    ok.textContent = confirmLabel;
    ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    dlg.returnValue = '';
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
  });
}

export function fieldError(input, message) {
  const p = input.closest('.field')?.querySelector('.field-error');
  if (p) p.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  return !message;
}

export function applyAppearance(s) {
  const r = document.documentElement;
  r.dataset.theme = s.theme; r.dataset.bg = s.background;
  r.dataset.motion = s.animations ? 'on' : 'off'; r.dataset.speed = s.speed;
}
export const animationsEnabled = () =>
  document.documentElement.dataset.motion !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const speedFactor = () => Number(getComputedStyle(document.documentElement).getPropertyValue('--dur')) || 1;

let audioCtx;
export function playTone(kind = 'up') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    const [from, to] = kind === 'down' ? [1100, 160] : [160, 1100];
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.7);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.85);
  } catch (e) { console.warn('ChronoShift: audio unavailable', e); }
}
