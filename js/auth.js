// Frontend-only admin authentication.
// IMPORTANT: this is a convenience lock, NOT real security. Everything lives in the
// browser, so anyone with access to this browser profile or DevTools can read, alter
// or bypass it. Real authentication needs a server that verifies credentials.
import { load, save, KEYS, clearAllData } from './storage.js';
import { uid } from './utils.js';

const SESSION_KEY = 'chronoshift:session';
const ITERATIONS = 210000;
const enc = new TextEncoder();
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const cryptoAvailable = () => !!(globalThis.crypto && crypto.subtle);

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const hasAdmin = () => !!load(KEYS.ADMIN, null);
export const currentAdmin = () => { const a = load(KEYS.ADMIN, null); return a ? { id: a.id, name: a.name, email: a.email } : null; };

export async function createAdmin({ name, email, password }) {
  if (hasAdmin()) throw new Error('An admin account already exists on this device.');
  if (!cryptoAvailable()) throw new Error('Secure hashing needs http://localhost or http://127.0.0.1 (use VS Code Live Server).');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  const ok = save(KEYS.ADMIN, { id: uid(), name, email: email.toLowerCase(), salt: toB64(salt), hash: toB64(hash), iterations: ITERATIONS, createdAt: Date.now() });
  if (!ok) throw new Error('The account could not be saved.');
}

export async function verify(email, password) {
  const admin = load(KEYS.ADMIN, null);
  if (!admin) return false;
  if (!cryptoAvailable()) throw new Error('Secure hashing needs http://localhost or http://127.0.0.1 (use VS Code Live Server).');
  const hash = toB64(await derive(password, fromB64(admin.salt), admin.iterations));
  return safeEqual(hash, admin.hash) && email.trim().toLowerCase() === admin.email;
}

export function startSession(remember) {
  const admin = load(KEYS.ADMIN, null);
  if (!admin) return;
  clearSession();
  const ttl = remember ? 14 * 24 * 3600e3 : 12 * 3600e3;
  const store = remember ? localStorage : sessionStorage; // tab-only when not remembered
  try { store.setItem(SESSION_KEY, JSON.stringify({ adminId: admin.id, expires: Date.now() + ttl })); } catch (e) { console.warn(e); }
}
function clearSession() { try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) { console.warn(e); } }

export function isAuthenticated() {
  const admin = load(KEYS.ADMIN, null);
  if (!admin) return false;
  for (const store of [sessionStorage, localStorage]) {
    try {
      const s = JSON.parse(store.getItem(SESSION_KEY) || 'null');
      if (s && s.adminId === admin.id && s.expires > Date.now()) return true;
    } catch (e) { console.warn(e); }
  }
  clearSession();
  return false;
}
export function requireAuth() {
  if (isAuthenticated()) return true;
  location.replace('login.html');
  return false;
}
export function logout() { clearSession(); location.replace('login.html'); }
export function resetEverything() { clearAllData(); }
