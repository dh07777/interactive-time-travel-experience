// Personal Time Capsule: notes attached to specific years.
import { getList, save, KEYS } from './storage.js';
import { $, $$, esc, uid, icon, toast, confirmDialog, fieldError, emptyState, highlight, MIN_YEAR, MAX_YEAR, isValidYear, yearDiffLabel, fmtDateTime, plural } from './utils.js';

export function mount(root, app) {
  let notes = getList(KEYS.NOTES);
  let editingId = null;
  const filters = { q: '', sort: 'newest' };

  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Personal archive</p><h1>Time Capsule</h1>
    <p class="muted">Write notes to any year. They are saved in this browser and stay until you delete them.</p></div></header>
    <div class="split">
      <form id="nt-form" class="glass pad form-sticky" novalidate aria-labelledby="nt-form-title">
        <h2 id="nt-form-title">Write a note</h2>
        <div class="field"><label for="nt-year">Year</label><input id="nt-year" name="year" type="number" inputmode="numeric" min="${MIN_YEAR}" max="${MAX_YEAR}"><p class="field-error" role="alert"></p></div>
        <div class="field"><label for="nt-title">Title</label><input id="nt-title" name="title" maxlength="80" autocomplete="off"><p class="field-error" role="alert"></p></div>
        <div class="field"><label for="nt-desc">Description</label><textarea id="nt-desc" name="description" rows="6" maxlength="2000"></textarea><p class="field-error" role="alert"></p></div>
        <div class="form-actions"><button class="btn btn-primary" type="submit" id="nt-submit">${icon('plus', 18)} Save note</button><button type="button" class="btn btn-ghost" data-act="cancel" hidden>Cancel edit</button></div>
      </form>
      <section aria-label="Notes">
        <div class="glass pad"><div class="filters" style="grid-template-columns:1fr 200px">
          <div class="field"><label for="nt-q">Search notes</label><input id="nt-q" type="search" placeholder="Title, text or year…" autocomplete="off"></div>
          <div class="field"><label for="nt-sort">Sort</label><select id="nt-sort"><option value="newest">Newest created</option><option value="asc">Year, oldest first</option><option value="desc">Year, newest first</option></select></div>
        </div><p class="muted small" id="nt-count" aria-live="polite" style="margin:12px 0 0"></p></div>
        <div id="nt-list" style="margin-top:16px"></div>
      </section>
    </div>`;

  const form = $('#nt-form', root), listEl = $('#nt-list', root), countEl = $('#nt-count', root);

  function resetForm() {
    editingId = null; form.reset();
    form.elements.year.value = app.state.year;
    $('#nt-form-title', root).textContent = 'Write a note';
    $('#nt-submit', root).innerHTML = `${icon('plus', 18)} Save note`;
    $('[data-act="cancel"]', form).hidden = true;
    $$('.field-error', form).forEach((p) => { p.textContent = ''; });
    $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
  }

  function visible() {
    const q = filters.q.trim().toLowerCase();
    const items = notes.filter((n) => !q || [n.title, n.description, String(n.year)].some((s) => s.toLowerCase().includes(q)));
    const by = { newest: (a, b) => b.createdAt - a.createdAt, asc: (a, b) => a.year - b.year || b.createdAt - a.createdAt, desc: (a, b) => b.year - a.year || b.createdAt - a.createdAt };
    return items.sort(by[filters.sort]);
  }

  function renderList() {
    const items = visible(), q = filters.q.trim();
    countEl.textContent = notes.length ? `Showing ${items.length} of ${plural(notes.length, 'note')}` : '';
    if (!notes.length) { listEl.innerHTML = `<div class="glass pad">${emptyState({ ic: 'archive', title: 'Your time capsule is empty', text: 'Write your first note using the form.' })}</div>`; return; }
    if (!items.length) { listEl.innerHTML = `<div class="glass pad">${emptyState({ ic: 'search', title: 'No notes match', text: 'Try a different search term.', action: '<button class="btn btn-sm" data-act="clear">Clear search</button>' })}</div>`; return; }
    listEl.innerHTML = `<div class="card-grid">${items.map((n) => `
      <article class="glass note-card">
        <span class="big-year">${n.year}</span><span class="muted small">${yearDiffLabel(n.year)}</span>
        <h3 style="margin-top:8px">${highlight(n.title, q)}</h3>
        <p>${highlight(n.description, q)}</p>
        <span class="muted small">Saved ${fmtDateTime(n.createdAt)}${n.updatedAt > n.createdAt ? ' · edited' : ''}</span>
        <div class="card-actions">
          <button class="btn btn-sm" data-act="travel" data-id="${n.id}" aria-label="Travel to ${n.year}">${icon('clock', 16)} Travel</button>
          <button class="btn btn-sm" data-act="edit" data-id="${n.id}" aria-label="Edit ${esc(n.title)}">${icon('edit', 16)} Edit</button>
          <button class="btn btn-sm btn-danger" data-act="delete" data-id="${n.id}" aria-label="Delete ${esc(n.title)}">${icon('trash', 16)} Delete</button>
        </div></article>`).join('')}</div>`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const year = f.year.value.trim(), title = f.title.value.trim(), desc = f.description.value.trim();
    const results = [
      fieldError(f.year, isValidYear(year) ? '' : `Enter a year between ${MIN_YEAR} and ${MAX_YEAR}.`),
      fieldError(f.title, title.length < 2 ? 'Enter a title of at least 2 characters.' : ''),
      fieldError(f.description, desc.length < 3 ? 'Write at least 3 characters.' : ''),
    ];
    if (results.includes(false)) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const now = Date.now(), previous = notes;
    notes = editingId
      ? notes.map((n) => (n.id === editingId ? { ...n, year: Number(year), title, description: desc, updatedAt: now } : n))
      : [...notes, { id: uid(), year: Number(year), title, description: desc, createdAt: now, updatedAt: now }];
    if (!save(KEYS.NOTES, notes)) { notes = previous; return; }
    toast(editingId ? 'Note updated.' : 'Note saved to your time capsule.', 'success');
    resetForm(); renderList();
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act, note = notes.find((n) => n.id === b.dataset.id);
    if (act === 'cancel') resetForm();
    else if (act === 'clear') { filters.q = ''; $('#nt-q', root).value = ''; renderList(); }
    else if (act === 'travel' && note) { app.setYear(note.year, { travel: true }); app.navigate('time-machine'); }
    else if (act === 'edit' && note) {
      editingId = note.id;
      const f = form.elements;
      f.year.value = note.year; f.title.value = note.title; f.description.value = note.description;
      $('#nt-form-title', root).textContent = 'Edit note';
      $('#nt-submit', root).innerHTML = `${icon('edit', 18)} Save changes`;
      $('[data-act="cancel"]', form).hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.title.focus();
    } else if (act === 'delete' && note) {
      const ok = await confirmDialog({ title: 'Delete this note?', text: `“${note.title}” (${note.year}) will be removed permanently.`, confirmLabel: 'Delete note' });
      if (!ok) return;
      notes = notes.filter((n) => n.id !== note.id);
      save(KEYS.NOTES, notes);
      if (editingId === note.id) resetForm();
      toast('Note deleted.', 'success'); renderList();
    }
  });
  $('#nt-q', root).addEventListener('input', (e) => { filters.q = e.target.value; renderList(); });
  $('#nt-sort', root).addEventListener('change', (e) => { filters.sort = e.target.value; renderList(); });

  resetForm();
  renderList();
}
