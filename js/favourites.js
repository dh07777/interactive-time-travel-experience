// Favourite years: save, remove, and travel.
import { getList, save, KEYS, yearIndex } from './storage.js';
import { $, icon, toast, emptyState, fieldError, MIN_YEAR, MAX_YEAR, isValidYear, eraOf, yearDiffLabel, plural } from './utils.js';

export function mount(root, app) {
  let favs = getList(KEYS.FAVS);

  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Bookmarks</p><h1>Favourite Years</h1>
    <p class="muted">Pin the years you return to most. Select one to travel there instantly.</p></div></header>
    <form id="fav-form" class="glass pad" novalidate>
      <div class="field" style="margin:0"><label for="fav-year">Add a favourite year</label>
        <div class="inline" style="max-width:420px"><input id="fav-year" type="number" inputmode="numeric" min="${MIN_YEAR}" max="${MAX_YEAR}" placeholder="e.g. ${app.state.year}"><button class="btn btn-primary" type="submit">${icon('star', 18)} Save year</button></div>
        <p class="field-error" role="alert"></p></div>
      <button type="button" class="btn btn-sm" data-act="add-current">Save the selected year (${app.state.year})</button>
    </form>
    <div id="fav-list"></div>`;

  const listEl = $('#fav-list', root), input = $('#fav-year', root);

  function add(year) {
    if (favs.some((f) => f.year === year)) { toast(`${year} is already in your favourites.`); return false; }
    favs = [...favs, { year, createdAt: Date.now() }];
    if (!save(KEYS.FAVS, favs)) { favs = favs.slice(0, -1); return false; }
    toast(`${year} saved to favourites.`, 'success');
    renderList();
    return true;
  }

  function renderList() {
    if (!favs.length) { listEl.innerHTML = `<div class="glass pad">${emptyState({ ic: 'star', title: 'No favourite years yet', text: 'Save a year above, or use the star button in the Time Machine.' })}</div>`; return; }
    const idx = yearIndex();
    const sorted = [...favs].sort((a, b) => a.year - b.year);
    listEl.innerHTML = `<div class="card-grid">${sorted.map((f) => {
      const d = idx.get(f.year) || { events: 0, notes: 0 }, era = eraOf(f.year);
      return `<article class="glass note-card"><span class="big-year">${f.year}</span>
        <p class="small" style="margin:4px 0 10px"><span class="chip" data-era="${era}">${era}</span> <span class="muted">${yearDiffLabel(f.year)}</span></p>
        <p class="small">${plural(d.events, 'event')} · ${plural(d.notes, 'note')}</p>
        <div class="card-actions"><button class="btn btn-primary btn-sm" data-act="travel" data-year="${f.year}">${icon('clock', 16)} Travel to ${f.year}</button>
        <button class="btn btn-sm btn-danger" data-act="remove" data-year="${f.year}" aria-label="Remove ${f.year} from favourites">${icon('trash', 16)} Remove</button></div></article>`;
    }).join('')}</div>`;
  }

  $('#fav-form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!fieldError(input, isValidYear(v) ? '' : `Enter a four-digit year between ${MIN_YEAR} and ${MAX_YEAR}.`)) return;
    if (add(Number(v))) input.value = '';
  });
  input.addEventListener('input', () => fieldError(input, ''));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const year = Number(b.dataset.year);
    if (b.dataset.act === 'add-current') add(app.state.year);
    else if (b.dataset.act === 'travel') { app.setYear(year, { travel: true }); app.navigate('time-machine'); }
    else if (b.dataset.act === 'remove') {
      favs = favs.filter((f) => f.year !== year); save(KEYS.FAVS, favs);
      toast(`${year} removed from favourites.`, 'success'); renderList();
    }
  });
  renderList();
}
