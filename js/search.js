// Global search across events, notes and saved years.
import { getList, KEYS } from './storage.js';
import { esc, icon, emptyState, highlight, isValidYear, MIN_YEAR, MAX_YEAR, plural } from './utils.js';

export function mount(root, app, query = '') {
  const q = query.trim(), needle = q.toLowerCase();
  if (!q) {
    root.innerHTML = `<header class="page-head"><h1>Search</h1></header><section class="glass pad">${emptyState({ ic: 'search', title: 'Search ChronoShift', text: 'Use the search bar above to look through your events, notes and favourite years.' })}</section>`;
    return;
  }
  const has = (...f) => f.some((s) => String(s).toLowerCase().includes(needle));
  const events = getList(KEYS.EVENTS).filter((e) => has(e.title, e.description, e.category, e.year));
  const notes = getList(KEYS.NOTES).filter((n) => has(n.title, n.description, n.year));
  const favs = getList(KEYS.FAVS).filter((f) => has(f.year));
  const total = events.length + notes.length + favs.length;
  const goBtn = (year, label = 'Travel') => `<button class="btn btn-sm" data-go="time-machine" data-year="${year}" aria-label="Travel to ${year}">${icon('clock', 16)} ${label}</button>`;

  const group = (title, ic, items, render) => (items.length ? `<section class="glass pad result-group"><h2>${icon(ic, 20)} ${title} <span class="chip">${items.length}</span></h2><ul class="list">${items.map(render).join('')}</ul></section>` : '');
  const item = (kind, view) => (x) => `<li class="note-mini"><strong>${x.year}</strong>${highlight(x.title, q)}${x.category ? ` <span class="chip">${esc(x.category)}</span>` : ''}
    <p>${highlight(x.description.slice(0, 180) + (x.description.length > 180 ? '…' : ''), q)}</p>
    <div class="card-actions">${goBtn(x.year)}<a class="btn btn-sm" href="#/${view}">Open ${kind}</a></div></li>`;

  const yearHit = isValidYear(q) ? `<section class="glass pad result-group"><h2>${icon('rocket', 20)} Year ${esc(q)}</h2><p class="muted">Jump straight to this year.</p>${goBtn(Number(q), `Travel to ${esc(q)}`)}</section>` : '';

  root.innerHTML = `<header class="page-head"><div><p class="eyebrow">Search</p><h1>Results for “${esc(q)}”</h1><p class="muted" aria-live="polite">${plural(total, 'match')} found.</p></div></header>
    ${yearHit}
    ${group('Events', 'book', events, item('Explorer', 'explorer'))}
    ${group('Time capsule notes', 'archive', notes, item('Time Capsule', 'capsule'))}
    ${group('Favourite years', 'star', favs, (f) => `<li class="note-mini"><strong>${f.year}</strong>Saved favourite<div class="card-actions">${goBtn(f.year)}<a class="btn btn-sm" href="#/favourites">Open favourites</a></div></li>`)}
    ${total || yearHit ? '' : `<section class="glass pad">${emptyState({ ic: 'search', title: 'Nothing matched', text: `No events, notes or favourite years contain “${q}”. Check the spelling, try a shorter word, or type a year between ${MIN_YEAR} and ${MAX_YEAR}.`, action: '<a class="btn btn-sm" href="#/explorer">Add an event</a> <a class="btn btn-sm" href="#/capsule">Write a note</a>' })}</section>`}`;
}
