// Past vs Future comparison of two different years.
import { getList, KEYS, isFavourite, getSettings, saveSettings } from './storage.js';
import { $, esc, icon, toast, MIN_YEAR, MAX_YEAR, currentYear, clampYear, isValidYear, eraOf, yearDiffLabel, fieldError, plural } from './utils.js';

const pct = (y) => ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

export function mount(root, app) {
  const now = currentYear();
  const saved = getSettings().compare || {};
  let a = isValidYear(saved.a) ? Number(saved.a) : app.state.year;
  let b = isValidYear(saved.b) ? Number(saved.b) : (a === now ? Math.min(MAX_YEAR, now + 25) : now);

  const col = (side, label) => `
    <div class="cmp-col"><h2><span class="badge-${side}">${label}</span> Year ${label}</h2>
      <div class="field"><label for="cmp-${side}-num">Year ${label}</label><input id="cmp-${side}-num" type="number" inputmode="numeric" min="${MIN_YEAR}" max="${MAX_YEAR}" data-side="${side}"><p class="field-error" role="alert"></p></div>
      <label class="sr-only" for="cmp-${side}-range">Year ${label} slider</label>
      <input id="cmp-${side}-range" class="slider" type="range" min="${MIN_YEAR}" max="${MAX_YEAR}" step="1" data-side="${side}" style="margin-bottom:12px">
      <div class="card-actions" style="margin-top:0"><button class="btn btn-sm" data-act="use" data-side="${side}">Use selected year</button><button class="btn btn-sm" data-act="travel" data-side="${side}">${icon('clock', 16)} Travel</button></div>
    </div>`;

  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Two moments, one view</p><h1>Past vs Future</h1>
    <p class="muted">Pick two different years to measure the distance between them. Change either year with the fields, the sliders, or by clicking the timeline.</p></div></header>
    <section class="glass pad cmp-controls">${col('a', 'A')}
      <button class="btn btn-icon swap" data-act="swap" aria-label="Swap year A and year B">${icon('swap')}</button>${col('b', 'B')}</section>
    <section class="glass pad" id="cmp-result" aria-live="polite"></section>`;

  const out = $('#cmp-result', root);
  const num = { a: $('#cmp-a-num', root), b: $('#cmp-b-num', root) };
  const rng = { a: $('#cmp-a-range', root), b: $('#cmp-b-range', root) };

  function side(year, label) {
    const ev = getList(KEYS.EVENTS).filter((e) => e.year === year), nt = getList(KEYS.NOTES).filter((n) => n.year === year);
    const li = (items) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i.title)}</li>`).join('')}</ul>` : '<p class="muted small" style="margin:6px 0 0">Nothing saved for this year.</p>');
    return `<div class="side-box"><h3><span class="badge-${label.toLowerCase()}">${label}</span> ${year} <span class="chip" data-era="${eraOf(year)}">${eraOf(year)}</span> ${isFavourite(year) ? icon('star', 16) : ''}</h3>
      <p class="muted small">${yearDiffLabel(year)}</p>
      <strong class="small">${plural(ev.length, 'event')}</strong>${li(ev)}<strong class="small" style="display:block;margin-top:10px">${plural(nt.length, 'note')}</strong>${li(nt)}</div>`;
  }

  function render() {
    num.a.value = a; num.b.value = b; rng.a.value = a; rng.b.value = b;
    if (a === b) {
      out.innerHTML = `<div class="notice notice-warn" style="margin:0" role="alert"><strong>Choose two different years.</strong> Year A and year B are both ${a}. Change one of them to see the comparison.</div>`;
      return;
    }
    const lo = Math.min(a, b), hi = Math.max(a, b), d = hi - lo;
    let ticks = '';
    [1900, 1950, 2000, 2050, 2100].forEach((y) => { ticks += `<span class="track-tick" style="left:${pct(y)}%">${y}</span>`; });
    out.innerHTML = `
      <h2>${a < b ? `Year B is ${plural(d, 'year')} after year A` : `Year B is ${plural(d, 'year')} before year A`}</h2>
      <div class="cmp-stats">
        <div class="cmp-stat"><strong>${d}</strong><span>Years apart</span></div>
        <div class="cmp-stat"><strong>${(d / 10).toFixed(1)}</strong><span>Decades</span></div>
        <div class="cmp-stat"><strong>${(d / 100).toFixed(2)}</strong><span>Centuries</span></div>
        <div class="cmp-stat"><strong>${Math.round(d * 365.25).toLocaleString()}</strong><span>Approximate days</span></div>
      </div>
      <div class="cmp-track" data-ref="ctrack" role="group" aria-label="Comparison timeline. Click to move the nearest year marker.">
        <span class="track-line"></span>${ticks}
        <span class="cmp-span" style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></span>
        <span class="track-now" style="left:${pct(now)}%;top:28px" title="Present: ${now}"></span>
        <span class="cmp-label" style="left:${pct(a)}%">${a}</span>
        <span class="cmp-pin pin-a" style="left:${pct(a)}%"><span>A</span></span>
        <span class="cmp-pin pin-b" style="left:${pct(b)}%"><span>B</span></span>
      </div>
      <p class="muted small" style="text-align:center;margin:0">Amber tick marks the present (${now}).</p>
      <div class="cmp-sides">${side(a, 'A')}${side(b, 'B')}</div>`;
  }

  function set(sideKey, year) {
    year = clampYear(year);
    if (sideKey === 'a') a = year; else b = year;
    saveSettings({ compare: { a, b } });
    render();
  }

  root.addEventListener('input', (e) => {
    const t = e.target, s = t.dataset.side;
    if (!s) return;
    if (t.type === 'range') { set(s, t.value); return; }
    if (!fieldError(t, isValidYear(t.value) ? '' : `Enter a year between ${MIN_YEAR} and ${MAX_YEAR}.`)) return;
    const prevFocus = document.activeElement;
    set(s, t.value);
    prevFocus?.focus?.();
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'number' && t.dataset.side) { fieldError(t, ''); t.value = t.dataset.side === 'a' ? a : b; }
  });
  root.addEventListener('click', (e) => {
    const track = e.target.closest('[data-ref="ctrack"]');
    if (track) {
      const r = track.getBoundingClientRect();
      const y = clampYear(MIN_YEAR + ((e.clientX - r.left) / r.width) * (MAX_YEAR - MIN_YEAR));
      set(Math.abs(y - a) <= Math.abs(y - b) ? 'a' : 'b', y);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const s = btn.dataset.side;
    if (btn.dataset.act === 'swap') { [a, b] = [b, a]; saveSettings({ compare: { a, b } }); render(); }
    else if (btn.dataset.act === 'use') { set(s, app.state.year); toast(`Year ${s.toUpperCase()} set to ${app.state.year}.`); }
    else if (btn.dataset.act === 'travel') { app.setYear(s === 'a' ? a : b, { travel: true }); app.navigate('time-machine'); }
  });
  render();
}
