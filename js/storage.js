// LocalStorage wrapper. Every key is namespaced and every access is guarded.
import { toast } from './utils.js';

const NS = 'chronoshift:';
export const KEYS = { ADMIN: 'admin', EVENTS: 'events', NOTES: 'notes', FAVS: 'favourites', SETTINGS: 'settings' };
export const DEFAULT_SETTINGS = { theme: 'quantum', background: 'navy', animations: true, speed: 'normal', sound: false, year: null, compare: null };

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) { console.warn('ChronoShift: could not read', key, e); return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
  catch (e) {
    console.warn('ChronoShift: could not save', key, e);
    toast('Could not save. Browser storage is full or blocked.', 'error');
    return false;
  }
}
export const remove = (key) => { try { localStorage.removeItem(NS + key); } catch (e) { console.warn(e); } };
export const getList = (key) => { const v = load(key, []); return Array.isArray(v) ? v : []; };
export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...load(KEYS.SETTINGS, {}) });
export const saveSettings = (patch) => { const s = { ...getSettings(), ...patch }; save(KEYS.SETTINGS, s); return s; };

export const isFavourite = (year) => getList(KEYS.FAVS).some((f) => f.year === year);
export function toggleFavourite(year) {
  const favs = getList(KEYS.FAVS);
  const i = favs.findIndex((f) => f.year === year);
  if (i >= 0) favs.splice(i, 1); else favs.push({ year, createdAt: Date.now() });
  save(KEYS.FAVS, favs);
  return i < 0; // true when added
}

// Map of year -> { events, notes, fav } built only from user-created records.
export function yearIndex() {
  const map = new Map();
  const bump = (y, k) => { const o = map.get(y) || { events: 0, notes: 0, fav: false }; if (k === 'fav') o.fav = true; else o[k] += 1; map.set(y, o); };
  getList(KEYS.EVENTS).forEach((e) => bump(e.year, 'events'));
  getList(KEYS.NOTES).forEach((n) => bump(n.year, 'notes'));
  getList(KEYS.FAVS).forEach((f) => bump(f.year, 'fav'));
  return map;
}

export function clearUserData() { [KEYS.EVENTS, KEYS.NOTES, KEYS.FAVS, KEYS.SETTINGS].forEach(remove); }
export function clearAllData() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem(NS + 'session');
  } catch (e) { console.warn(e); }
}
export function storageUsageKB() {
  let chars = 0;
  try { Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => { chars += k.length + (localStorage.getItem(k) || '').length; }); } catch (e) { console.warn(e); }
  return Math.max(0.1, (chars * 2) / 1024).toFixed(1);
}
