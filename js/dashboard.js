import { getList, KEYS } from './storage.js';
import { $, esc, icon, emptyState, MIN_YEAR, plural } from './utils.js';
import { mountMachine } from './time-machine.js';

const LINKS = [
  ['time-machine', 'clock', 'Time Machine', 'Travel to any year'],
  ['explorer', 'book', 'Historical Explorer', 'Record events'],
  ['comparison', 'compare', 'Past vs Future', 'Compare two years'],
  ['capsule', 'archive', 'Time Capsule', 'Notes for a year'],
  ['favourites', 'star', 'Favourite Years', 'Jump to saved years'],
  ['settings', 'sliders', 'Settings', 'Theme and motion'],
];

function decadeChart(events, notes) {
  if (!events.length && !notes.length) {
    return emptyState({ ic: 'book', title: 'No activity yet', text: 'Add events or time capsule notes and they will appear here by decade.', action: '<a class="btn btn-sm" href="#/explorer">Add your first event</a>' });
  }
  const n = 21, ev = Array(n).fill(0), nt = Array(n).fill(0);
  events.forEach((e) => { ev[Math.floor((e.year - MIN_YEAR) / 10)]++; });
  notes.forEach((x) => { nt[Math.floor((x.year - MIN_YEAR) / 10)]++; });
  const max = Math.max(1, ...ev, ...nt);
  const h = (v) => (v ? Math.max(6, (v / max) * 100) : 0);
  const cols = ev.map((v, i) => `<div class="chart-col"><div class="bars"><span class="bar bar-ev" style="height:${h(v)}%" title="${MIN_YEAR + i * 10}s: ${plural(v, 'event')}"></span><span class="bar bar-nt" style="height:${h(nt[i])}%" title="${MIN_YEAR + i * 10}s: ${plural(nt[i], 'note')}"></span></div><span class="chart-label">${MIN_YEAR + i * 10}</span></div>`).join('');
  return `<div class="chart" role="img" aria-label="Bar chart of ${plural(events.length, 'event')} and ${plural(notes.length, 'note')} by decade">${cols}</div>
    <div class="legend"><span><i style="background:var(--accent-2)"></i>Events</span><span><i style="background:var(--purple)"></i>Notes</span></div>`;
}

export function mount(root, app) {
  const events = getList(KEYS.EVENTS), notes = getList(KEYS.NOTES), favs = getList(KEYS.FAVS);
  const recent = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const name = app.admin?.name || 'Admin';

  root.innerHTML = `
    <section class="hero glass pad">
      <div><p class="eyebrow">Temporal command centre</p><h1>Welcome back, ${esc(name)}</h1>
      <p class="muted">Your time machine is idle at the selected year. Choose a destination below.</p></div>
      <div class="clock-box"><time id="clock" aria-label="Current time"></time><p class="muted" id="date"></p></div>
    </section>
    <div id="machine-slot"></div>
    <section class="stats" aria-label="Summary">
      <a class="glass stat" href="#/time-machine"><strong id="stat-year">${app.state.year}</strong><span>Selected year</span></a>
      <a class="glass stat" href="#/explorer"><strong>${events.length}</strong><span>Historical events</span></a>
      <a class="glass stat" href="#/capsule"><strong>${notes.length}</strong><span>Capsule notes</span></a>
      <a class="glass stat" href="#/favourites"><strong>${favs.length}</strong><span>Favourite years</span></a>
    </section>
    <div class="grid-2">
      <section class="glass pad"><h2>Quick navigation</h2><div class="qlinks">
        ${LINKS.map(([k, ic, t, d]) => `<a class="qlink" href="#/${k}">${icon(ic, 22)}<span>${t}<small>${d}</small></span></a>`).join('')}
      </div></section>
      <section class="glass pad"><h2>Recently created notes</h2>
        ${recent.length ? `<ul class="list">${recent.map((n) => `<li class="note-mini"><strong>${n.year}</strong>${esc(n.title)}<p>${esc(n.description).slice(0, 110)}${n.description.length > 110 ? '…' : ''}</p></li>`).join('')}</ul>`
          : emptyState({ ic: 'archive', title: 'No notes yet', text: 'Your time capsule is empty. Write a note to a specific year.', action: '<a class="btn btn-primary btn-sm" href="#/capsule">Create a note</a>' })}
      </section>
    </div>
    <section class="glass pad"><h2>Activity by decade</h2>${decadeChart(events, notes)}</section>`;

  const stopMachine = mountMachine($('#machine-slot', root), app);
  const clock = $('#clock', root), date = $('#date', root);
  const tick = () => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString();
    date.textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  tick();
  const timer = setInterval(tick, 1000);
  const onYear = (e) => { $('#stat-year', root).textContent = e.detail.year; };
  document.addEventListener('chronoshift:year', onYear);
  return () => { clearInterval(timer); stopMachine(); document.removeEventListener('chronoshift:year', onYear); };
}
