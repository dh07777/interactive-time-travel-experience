// App shell: auth guard, router, shared year state, global UI.
import { requireAuth, currentAdmin, logout } from './auth.js';
import { getSettings, saveSettings } from './storage.js';
import { $, $$, esc, icon, fillIcons, clampYear, currentYear, isValidYear, applyAppearance, animationsEnabled, playTone, speedFactor, toast } from './utils.js';
import * as dashboard from './dashboard.js';
import * as timeMachine from './time-machine.js';
import * as explorer from './explorer.js';
import * as comparison from './comparison.js';
import * as capsule from './time-capsule.js';
import * as favourites from './favourites.js';
import * as settings from './settings.js';
import * as search from './search.js';

const VIEWS = {
  dashboard: { title: 'Dashboard', icon: 'home', mod: dashboard, nav: true },
  'time-machine': { title: 'Time Machine', icon: 'clock', mod: timeMachine, nav: true },
  explorer: { title: 'Historical Explorer', icon: 'book', mod: explorer, nav: true },
  comparison: { title: 'Past vs Future', icon: 'compare', mod: comparison, nav: true },
  capsule: { title: 'Time Capsule', icon: 'archive', mod: capsule, nav: true },
  favourites: { title: 'Favourite Years', icon: 'star', mod: favourites, nav: true },
  settings: { title: 'Settings', icon: 'sliders', mod: settings, nav: true },
  search: { title: 'Search results', icon: 'search', mod: search, nav: false },
};

function start() {
  const s = getSettings();
  applyAppearance(s);
  const admin = currentAdmin();
  const root = $('#view');
  const overlay = $('#warp-overlay');
  const searchInput = $('#search-input');
  let cleanup = null;
  let overlayTimer = 0;

  const app = {
    state: { year: isValidYear(s.year) ? Number(s.year) : currentYear() },
    setYear, navigate, refresh: render, logout, admin,
  };

  function updatePill() { $('#year-pill').textContent = `Year ${app.state.year}`; }

  function setYear(y, { travel = false } = {}) {
    const year = clampYear(y);
    const from = app.state.year;
    app.state.year = year;
    saveSettings({ year });
    updatePill();
    if (travel && from !== year) warp(from, year);
    document.dispatchEvent(new CustomEvent('chronoshift:year', { detail: { year, from, travel } }));
  }

  function warp(from, to) {
    if (getSettings().sound) playTone(to > from ? 'up' : 'down');
    if (!animationsEnabled()) return;
    overlay.innerHTML = `<span class="warp-year">${to}</span>`;
    overlay.classList.remove('on');
    void overlay.offsetWidth;
    overlay.classList.add('on');
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => overlay.classList.remove('on'), 1400 * speedFactor() + 200);
  }

  function parseHash() {
    const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
    let param = rest.join('/');
    try { param = decodeURIComponent(param); } catch { /* keep raw */ }
    return { name: VIEWS[name] ? name : 'dashboard', param };
  }

  function navigate(name, param = '') {
    const hash = `#/${name}${param ? '/' + encodeURIComponent(param) : ''}`;
    if (location.hash === hash) render(); else location.hash = hash;
  }

  function render() {
    const { name, param } = parseHash();
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.warn(e); } }
    cleanup = null;
    const view = VIEWS[name];
    document.title = `${view.title} · ChronoShift`;
    $$('.nav-link').forEach((a) => (a.dataset.view === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    root.classList.remove('view-in'); void root.offsetWidth; root.classList.add('view-in');
    // Each view gets a fresh host element so its event listeners never pile up.
    const host = document.createElement('div');
    host.className = 'view-host';
    root.replaceChildren(host);
    try {
      cleanup = view.mod.mount(host, app, param);
    } catch (err) {
      console.error('ChronoShift view error:', err);
      host.innerHTML = `<section class="glass pad"><h1>Something went wrong</h1><p class="muted">This section failed to load. Your saved data is untouched.</p><button class="btn btn-primary" data-go="dashboard">Back to dashboard</button></section>`;
    }
    if (name === 'search') searchInput.value = param;
    closeNav();
    window.scrollTo(0, 0);
    root.focus({ preventScroll: true });
  }

  // --- chrome ---
  $('#nav-list').innerHTML = Object.entries(VIEWS).filter(([, v]) => v.nav)
    .map(([k, v]) => `<li><a class="nav-link" href="#/${k}" data-view="${k}">${icon(v.icon)}<span>${v.title}</span></a></li>`).join('');
  $('#user-chip').innerHTML = `<span class="avatar" aria-hidden="true">${esc((admin?.name || 'A').charAt(0).toUpperCase())}</span><span class="name">${esc(admin?.name || 'Admin')}</span>`;
  fillIcons();
  updatePill();

  const openNav = (open) => {
    document.body.classList.toggle('nav-open', open);
    $('#menu-btn').setAttribute('aria-expanded', String(open));
  };
  function closeNav() { openNav(false); }
  $('#menu-btn').addEventListener('click', () => openNav(!document.body.classList.contains('nav-open')));
  $('#backdrop').addEventListener('click', closeNav);

  $('#global-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) { toast('Type something to search for.'); searchInput.focus(); return; }
    navigate('search', q);
  });

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      if (go.dataset.year) setYear(Number(go.dataset.year), { travel: go.dataset.travel !== 'false' });
      navigate(go.dataset.go);
      return;
    }
    if (e.target.closest('[data-action="logout"]')) logout();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); searchInput.focus(); }
  });
  window.addEventListener('hashchange', render);
  overlay.addEventListener('animationend', (e) => { if (e.animationName === 'warp-fade') overlay.classList.remove('on'); });

  render();
  document.body.classList.remove('is-loading');
}

if (requireAuth()) start();
