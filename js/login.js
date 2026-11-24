import { hasAdmin, createAdmin, verify, startSession, isAuthenticated, resetEverything, cryptoAvailable } from './auth.js';
import { $, $$, icon, fieldError, toast, confirmDialog, applyAppearance, fillIcons } from './utils.js';
import { getSettings } from './storage.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function init() {
  applyAppearance(getSettings());
  if (isAuthenticated()) { location.replace('index.html'); return; }

  $$('[data-toggle-pw]').forEach((b) => { b.innerHTML = icon('eye'); });
  fillIcons();
  if (!cryptoAvailable()) {
    const w = $('#env-warning');
    w.hidden = false;
    w.textContent = 'Secure password hashing is unavailable here. Open this project through VS Code Live Server (http://127.0.0.1) instead of opening the file directly.';
  }
  showPanel();

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle-pw]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.innerHTML = icon(show ? 'eyeOff' : 'eye');
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.setAttribute('aria-pressed', String(show));
  });

  $('#setup-form').addEventListener('submit', onSetup);
  $('#login-form').addEventListener('submit', onLogin);
  $('#reset-device').addEventListener('click', onReset);
}

function showPanel() {
  const admin = hasAdmin();
  $('#setup-panel').hidden = admin;
  $('#login-panel').hidden = !admin;
  (admin ? $('#login-email') : $('#setup-name')).focus();
}

async function onSetup(e) {
  e.preventDefault();
  const f = e.currentTarget, err = $('#setup-error');
  err.textContent = '';
  const name = $('#setup-name').value.trim(), email = $('#setup-email').value.trim();
  const pw = $('#setup-password').value, confirm = $('#setup-confirm').value;
  const checks = [
    fieldError($('#setup-name'), name.length < 2 ? 'Enter a display name (2 to 40 characters).' : ''),
    fieldError($('#setup-email'), !EMAIL_RE.test(email) ? 'Enter a valid email address.' : ''),
    fieldError($('#setup-password'), pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Use at least 8 characters with a letter and a number.' : ''),
    fieldError($('#setup-confirm'), confirm !== pw ? 'Passwords do not match.' : ''),
  ];
  if (checks.includes(false)) return;
  const btn = $('#setup-submit');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    await createAdmin({ name, email, password: pw });
    f.reset();
    toast('Admin account created. Sign in to continue.', 'success');
    showPanel();
    $('#login-email').value = email.toLowerCase();
    $('#login-password').focus();
  } catch (ex) { err.textContent = ex.message; }
  finally { btn.disabled = false; btn.textContent = 'Create admin account'; }
}

async function onLogin(e) {
  e.preventDefault();
  const err = $('#login-error');
  err.textContent = '';
  const email = $('#login-email').value.trim(), pw = $('#login-password').value;
  const checks = [
    fieldError($('#login-email'), !EMAIL_RE.test(email) ? 'Enter a valid email address.' : ''),
    fieldError($('#login-password'), !pw ? 'Enter your password.' : ''),
  ];
  if (checks.includes(false)) return;
  const btn = $('#login-submit');
  btn.disabled = true; btn.textContent = 'Verifying…';
  try {
    if (await verify(email, pw)) {
      startSession($('#login-remember').checked);
      location.replace('index.html');
      return;
    }
    err.textContent = 'The email or password is incorrect.';
  } catch (ex) { err.textContent = ex.message; }
  btn.disabled = false; btn.textContent = 'Sign in';
}

async function onReset() {
  const ok = await confirmDialog({
    title: 'Reset this device?',
    text: 'This deletes the admin account and ALL ChronoShift data stored in this browser (events, notes, favourites, settings). It cannot be undone.',
    confirmLabel: 'Delete everything',
  });
  if (!ok) return;
  resetEverything();
  location.reload();
}

init();
