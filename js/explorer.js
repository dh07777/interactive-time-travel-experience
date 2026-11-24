// Historical Explorer: create, edit, delete, search, filter and sort custom events.
import { getList, save, KEYS } from './storage.js';
import { $, $$, esc, uid, icon, toast, confirmDialog, fieldError, emptyState, highlight, CATEGORIES, MIN_YEAR, MAX_YEAR, isValidYear, isHttpUrl, yearDiffLabel, plural } from './utils.js';

export function mount(root, app) {
  let events = getList(KEYS.EVENTS);
  let editingId = null;
  const filters = { q: '', cat: 'all', sort: 'asc' };
  const catOptions = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Chronicle</p><h1>Historical Explorer</h1>
    <p class="muted">Build your own timeline of events between ${MIN_YEAR} and ${MAX_YEAR}. Nothing is preloaded. Everything here is yours.</p></div></header>
    <div class="split">
      <form id="ev-form" class="glass pad form-sticky" novalidate aria-labelledby="ev-form-title">
        <h2 id="ev-form-title">Add historical event</h2>
        <div class="field"><label for="ev-title">Title</label><input id="ev-title" name="title" maxlength="80" autocomplete="off"><p class="field-error" role="alert"></p></div>
        <div class="field-row">
          <div class="field"><label for="ev-year">Year</label><input id="ev-year" name="year" type="number" inputmode="numeric" min="${MIN_YEAR}" max="${MAX_YEAR}"><p class="field-error" role="alert"></p></div>
          <div class="field"><label for="ev-cat">Category</label><select id="ev-cat" name="category">${catOptions}</select><p class="field-error" role="alert"></p></div>
        </div>
        <div class="field"><label for="ev-desc">Description</label><textarea id="ev-desc" name="description" rows="4" maxlength="1000"></textarea><p class="field-error" role="alert"></p></div>
        <div class="field"><label for="ev-img">Image URL <span class="optional">(optional)</span></label><input id="ev-img" name="image" type="url" placeholder="https://example.com/photo.jpg" maxlength="500"><p class="field-error" role="alert"></p></div>
        <div class="form-actions"><button class="btn btn-primary" type="submit" id="ev-submit">${icon('plus', 18)} Add event</button><button type="button" class="btn btn-ghost" data-act="cancel" hidden>Cancel edit</button></div>
      </form>
      <section aria-label="Events">
        <div class="glass pad">
          <div class="filters">
            <div class="field"><label for="ev-q">Search events</label><input id="ev-q" type="search" placeholder="Title, description, year…" autocomplete="off"></div>
            <div class="field"><label for="ev-f-cat">Category</label><select id="ev-f-cat"><option value="all">All categories</option>${catOptions}</select></div>
            <div class="field"><label for="ev-sort">Sort by year</label><select id="ev-sort"><option value="asc">Oldest first</option><option value="desc">Newest first</option></select></div>
          </div>
          <p class="muted small" id="ev-count" aria-live="polite" style="margin:12px 0 0"></p>
        </div>
        <div id="ev-list"></div>
      </section>
    </div>`;

  const form = $('#ev-form', root), listEl = $('#ev-list', root), countEl = $('#ev-count', root);

  function resetForm() {
    editingId = null;
    form.reset();
    form.elements.year.value = app.state.year;
    $('#ev-form-title', root).textContent = 'Add historical event';
    $('#ev-submit', root).innerHTML = `${icon('plus', 18)} Add event`;
    $('[data-act="cancel"]', form).hidden = true;
    $$('.field-error', form).forEach((p) => { p.textContent = ''; });
    $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
  }

  function visible() {
    const q = filters.q.trim().toLowerCase();
    return events
      .filter((e) => (filters.cat === 'all' || e.category === filters.cat)
        && (!q || [e.title, e.description, e.category, String(e.year)].some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => (filters.sort === 'asc' ? a.year - b.year : b.year - a.year) || a.createdAt - b.createdAt);
  }

  function card(ev, q) {
    return `<li class="tl-item"><span class="tl-year">${ev.year}</span>
      <article class="card glass">
        ${ev.image ? `<div class="ev-img"><img src="${esc(ev.image)}" alt="${esc(ev.title)}" loading="lazy" referrerpolicy="no-referrer"></div>` : ''}
        <div class="meta"><span class="chip">${esc(ev.category)}</span><span class="muted small">${yearDiffLabel(ev.year)}</span></div>
        <h3>${highlight(ev.title, q)}</h3>
        <p>${highlight(ev.description, q)}</p>
        <div class="card-actions">
          <button class="btn btn-sm" data-act="travel" data-id="${ev.id}" aria-label="Travel to ${ev.year}">${icon('clock', 16)} Travel</button>
          <button class="btn btn-sm" data-act="edit" data-id="${ev.id}" aria-label="Edit ${esc(ev.title)}">${icon('edit', 16)} Edit</button>
          <button class="btn btn-sm btn-danger" data-act="delete" data-id="${ev.id}" aria-label="Delete ${esc(ev.title)}">${icon('trash', 16)} Delete</button>
        </div>
      </article></li>`;
  }

  function renderList() {
    const items = visible();
    countEl.textContent = events.length ? `Showing ${items.length} of ${plural(events.length, 'event')}` : '';
    if (!events.length) {
      listEl.innerHTML = `<div class="glass pad" style="margin-top:16px">${emptyState({ ic: 'book', title: 'No events yet', text: 'Use the form to record your first historical event.' })}</div>`;
    } else if (!items.length) {
      listEl.innerHTML = `<div class="glass pad" style="margin-top:16px">${emptyState({ ic: 'search', title: 'No events match', text: 'Try a different search term or category.', action: '<button class="btn btn-sm" data-act="clear-filters">Clear filters</button>' })}</div>`;
    } else {
      listEl.innerHTML = `<ol class="tl">${items.map((e) => card(e, filters.q.trim())).join('')}</ol>`;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const title = f.title.value.trim(), desc = f.description.value.trim(), img = f.image.value.trim(), year = f.year.value.trim();
    const results = [
      fieldError(f.title, title.length < 3 ? 'Enter a title of at least 3 characters.' : ''),
      fieldError(f.year, isValidYear(year) ? '' : `Enter a year between ${MIN_YEAR} and ${MAX_YEAR}.`),
      fieldError(f.category, CATEGORIES.includes(f.category.value) ? '' : 'Choose a category.'),
      fieldError(f.description, desc.length < 10 ? 'Describe the event in at least 10 characters.' : ''),
      fieldError(f.image, img && !isHttpUrl(img) ? 'Enter a full http:// or https:// image address, or leave this empty.' : ''),
    ];
    if (results.includes(false)) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const now = Date.now();
    const data = { title, year: Number(year), category: f.category.value, description: desc, image: img };
    const previous = events;
    if (editingId) {
      events = events.map((x) => (x.id === editingId ? { ...x, ...data, updatedAt: now } : x));
    } else {
      events = [...events, { id: uid(), ...data, createdAt: now, updatedAt: now }];
    }
    if (!save(KEYS.EVENTS, events)) { events = previous; return; }
    toast(editingId ? 'Event updated.' : 'Event added.', 'success');
    resetForm(); renderList();
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act, ev = events.find((x) => x.id === b.dataset.id);
    if (act === 'cancel') resetForm();
    else if (act === 'clear-filters') {
      Object.assign(filters, { q: '', cat: 'all' });
      $('#ev-q', root).value = ''; $('#ev-f-cat', root).value = 'all'; renderList();
    } else if (act === 'travel' && ev) { app.setYear(ev.year, { travel: true }); app.navigate('time-machine'); }
    else if (act === 'edit' && ev) {
      editingId = ev.id;
      const f = form.elements;
      f.title.value = ev.title; f.year.value = ev.year; f.category.value = ev.category; f.description.value = ev.description; f.image.value = ev.image || '';
      $('#ev-form-title', root).textContent = 'Edit event';
      $('#ev-submit', root).innerHTML = `${icon('edit', 18)} Save changes`;
      $('[data-act="cancel"]', form).hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      f.title.focus();
    } else if (act === 'delete' && ev) {
      const ok = await confirmDialog({ title: 'Delete this event?', text: `“${ev.title}” (${ev.year}) will be removed permanently.`, confirmLabel: 'Delete event' });
      if (!ok) return;
      events = events.filter((x) => x.id !== ev.id);
      save(KEYS.EVENTS, events);
      if (editingId === ev.id) resetForm();
      toast('Event deleted.', 'success'); renderList();
    }
  });
  root.addEventListener('error', (e) => {
    if (e.target.tagName !== 'IMG') return;
    const fb = document.createElement('span');
    fb.className = 'img-fallback'; fb.textContent = 'Image could not be loaded';
    e.target.replaceWith(fb);
  }, true);
  $('#ev-q', root).addEventListener('input', (e) => { filters.q = e.target.value; renderList(); });
  $('#ev-f-cat', root).addEventListener('change', (e) => { filters.cat = e.target.value; renderList(); });
  $('#ev-sort', root).addEventListener('change', (e) => { filters.sort = e.target.value; renderList(); });

  resetForm();
  renderList();
}
