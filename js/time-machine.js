// Interactive time machine: reusable widget + full page.
import { getList, KEYS, yearIndex, toggleFavourite, isFavourite } from './storage.js';
import { $, esc, icon, toast, MIN_YEAR, MAX_YEAR, currentYear, isValidYear, yearDiffLabel, eraOf, fieldError, animationsEnabled, speedFactor, emptyState } from './utils.js';

const pct = (y) => ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

function ticksSvg() {
  let s = '';
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    s += `<line class="tick${big ? ' big' : ''}" x1="150" y1="${big ? 30 : 35}" x2="150" y2="42" transform="rotate(${i * 6} 150 150)"/>`;
  }
  return s;
}

function machineHTML() {
  return `
  <section class="machine glass" aria-label="Interactive time machine">
    <div class="machine-visual" data-ref="visual">
      <svg class="rings" viewBox="0 0 300 300" aria-hidden="true">
        <circle class="ring-line" cx="150" cy="150" r="146"/>
        <g class="ring-a"><circle class="ring-dash" cx="150" cy="150" r="132"/><circle class="orb" cx="150" cy="18" r="6"/></g>
        <g class="dial">${ticksSvg()}</g>
        <g class="ring-b"><circle class="ring-dash2" cx="150" cy="150" r="96"/><circle class="orb2" cx="150" cy="54" r="5"/></g>
        <circle class="core-ring" cx="150" cy="150" r="82"/>
        <polygon class="pointer" points="143,0 157,0 150,14"/>
      </svg>
      <div class="core">
        <span class="era" data-ref="era"></span>
        <output class="year-display" data-ref="year" aria-live="polite"></output>
        <span class="diff" data-ref="diff"></span>
      </div>
    </div>
    <div class="machine-controls">
      <div class="slider-block">
        <label class="sr-only" for="tm-slider">Select a year</label>
        <input id="tm-slider" class="slider" type="range" min="${MIN_YEAR}" max="${MAX_YEAR}" step="1" data-ref="slider">
        <div class="track" data-ref="track"></div>
      </div>
      <div class="control-row">
        <button type="button" class="btn btn-icon" data-act="prev" aria-label="Previous year">${icon('chevL')}</button>
        <form class="jump" data-ref="jump" novalidate>
          <div class="field">
            <label for="tm-jump">Jump to any year</label>
            <div class="inline">
              <input id="tm-jump" type="number" inputmode="numeric" min="${MIN_YEAR}" max="${MAX_YEAR}" data-ref="jumpInput">
              <button class="btn btn-primary" type="submit">Travel</button>
            </div>
            <p class="field-error" role="alert"></p>
          </div>
        </form>
        <button type="button" class="btn btn-icon" data-act="next" aria-label="Next year">${icon('chevR')}</button>
      </div>
      <div class="control-row wrap">
        <button type="button" class="btn" data-act="now">${icon('clock', 18)} Return to present</button>
        <button type="button" class="btn" data-act="fav" data-ref="fav" aria-pressed="false"></button>
      </div>
      <div class="legend" aria-label="Timeline legend"><span><i style="background:var(--accent-2)"></i>Event</span><span><i style="background:var(--purple)"></i>Note</span><span><i style="background:var(--warn)"></i>Favourite / present</span></div>
    </div>
  </section>`;
}

export function mountMachine(el, app) {
  el.innerHTML = machineHTML();
  const ref = (n) => el.querySelector(`[data-ref="${n}"]`);
  const visual = ref('visual'), slider = ref('slider'), jumpInput = ref('jumpInput'), favBtn = ref('fav'), track = ref('track');
  const prev = el.querySelector('[data-act="prev"]'), next = el.querySelector('[data-act="next"]');
  let raf = 0, pulseTimer = 0;

  function renderTrack() {
    let html = '<span class="track-line"></span>';
    [1900, 1925, 1950, 1975, 2000, 2025, 2050, 2075, 2100].forEach((y) => { html += `<span class="track-tick" style="left:${pct(y)}%">${y}</span>`; });
    html += `<span class="track-now" style="left:${pct(currentYear())}%" title="Present: ${currentYear()}"></span>`;
    yearIndex().forEach((v, y) => {
      const parts = [];
      if (v.events) parts.push(`${v.events} event${v.events > 1 ? 's' : ''}`);
      if (v.notes) parts.push(`${v.notes} note${v.notes > 1 ? 's' : ''}`);
      if (v.fav) parts.push('favourite');
      html += `<button type="button" class="track-dot ${v.fav ? 'is-fav' : v.events ? 'is-event' : 'is-note'}" style="left:${pct(y)}%" data-year="${y}" title="${y}: ${parts.join(', ')}" aria-label="Travel to ${y}: ${parts.join(', ')}"></button>`;
    });
    html += '<span class="track-cursor" data-ref="cursor"></span>';
    track.innerHTML = html;
  }

  function paint(year) {
    ref('year').textContent = year;
    slider.value = year;
    jumpInput.value = year;
    const era = eraOf(year), e = ref('era');
    e.textContent = era.toUpperCase();
    e.dataset.era = era;
    ref('diff').textContent = yearDiffLabel(year);
    visual.style.setProperty('--angle', `${((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 720}deg`);
    const cursor = ref('cursor');
    if (cursor) cursor.style.left = `${pct(year)}%`;
    const fav = isFavourite(year);
    favBtn.setAttribute('aria-pressed', String(fav));
    favBtn.classList.toggle('is-active', fav);
    favBtn.innerHTML = `${icon('star', 18)} ${fav ? 'Saved as favourite' : 'Save as favourite'}`;
    prev.disabled = year <= MIN_YEAR;
    next.disabled = year >= MAX_YEAR;
  }

  function pulse() {
    visual.classList.remove('warping'); void visual.offsetWidth; visual.classList.add('warping');
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => visual.classList.remove('warping'), 1000 * speedFactor());
  }

  function onYear(e) {
    const { year, from, travel } = e.detail;
    cancelAnimationFrame(raf);
    paint(year);
    if (!animationsEnabled()) return;
    pulse();
    if (travel && from !== year) {
      const out = ref('year'), t0 = performance.now(), dur = 800 * speedFactor();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        out.textContent = k < 1 ? Math.round(from + (year - from) * (1 - Math.pow(1 - k, 3))) : year;
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act],[data-year]');
    if (!b || !el.contains(b)) return;
    const act = b.dataset.act;
    if (act === 'prev') app.setYear(app.state.year - 1);
    else if (act === 'next') app.setYear(app.state.year + 1);
    else if (act === 'now') app.setYear(currentYear(), { travel: true });
    else if (act === 'fav') {
      const added = toggleFavourite(app.state.year);
      renderTrack(); paint(app.state.year);
      toast(added ? `${app.state.year} saved to favourites.` : `${app.state.year} removed from favourites.`, 'success');
    } else if (b.dataset.year) app.setYear(Number(b.dataset.year), { travel: true });
  });
  slider.addEventListener('input', () => app.setYear(Number(slider.value)));
  ref('jump').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = jumpInput.value.trim();
    if (!fieldError(jumpInput, isValidYear(v) ? '' : `Enter a four-digit year between ${MIN_YEAR} and ${MAX_YEAR}.`)) return;
    app.setYear(Number(v), { travel: true });
  });
  jumpInput.addEventListener('input', () => fieldError(jumpInput, ''));

  document.addEventListener('chronoshift:year', onYear);
  renderTrack();
  paint(app.state.year);
  return () => { document.removeEventListener('chronoshift:year', onYear); cancelAnimationFrame(raf); clearTimeout(pulseTimer); };
}

export function mount(root, app) {
  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Temporal engine</p><h1>Time Machine</h1>
    <p class="muted">Drag the slider, step year by year, or jump straight to any year from ${MIN_YEAR} to ${MAX_YEAR}. Dots on the timeline mark years where you saved something.</p></div></header>
    <div id="tm-slot"></div>
    <section class="glass pad" id="tm-context" aria-live="polite"></section>`;
  const stop = mountMachine($('#tm-slot', root), app);
  const ctx = $('#tm-context', root);

  function renderContext() {
    const y = app.state.year;
    const events = getList(KEYS.EVENTS).filter((e) => e.year === y);
    const notes = getList(KEYS.NOTES).filter((n) => n.year === y);
    const list = (items, kind) => items.length
      ? `<ul class="list">${items.map((i) => `<li class="note-mini"><strong>${y}</strong>${esc(i.title)}<p>${esc(i.description).slice(0, 140)}${i.description.length > 140 ? '…' : ''}</p></li>`).join('')}</ul>`
      : emptyState({ ic: kind === 'event' ? 'book' : 'archive', title: kind === 'event' ? `No events in ${y}` : `No notes for ${y}`, text: kind === 'event' ? 'Record something that happened in this year.' : 'Leave a note for this year.', action: `<a class="btn btn-sm" href="#/${kind === 'event' ? 'explorer' : 'capsule'}">${kind === 'event' ? 'Add an event' : 'Write a note'}</a>` });
    ctx.innerHTML = `<h2>What you saved for ${y}</h2><div class="ctx-list"><div><h3>Events</h3>${list(events, 'event')}</div><div><h3>Time capsule notes</h3>${list(notes, 'note')}</div></div>`;
  }
  renderContext();
  document.addEventListener('chronoshift:year', renderContext);
  return () => { stop(); document.removeEventListener('chronoshift:year', renderContext); };
}
