// Settings: theme, motion, sound, data clearing, logout.
import { getSettings, saveSettings, clearUserData, storageUsageKB, getList, KEYS } from './storage.js';
import { $, esc, icon, toast, confirmDialog, applyAppearance, playTone, currentYear } from './utils.js';

const THEMES = [['quantum', 'Quantum Blue', 'linear-gradient(135deg,#3b82ff,#22e4ff)'], ['nebula', 'Nebula Purple', 'linear-gradient(135deg,#8b5cf6,#5b9bff)'], ['cyber', 'Cyber Cyan', 'linear-gradient(135deg,#22e4ff,#9b6bff)']];
const BGS = [['navy', 'Deep navy', '#0b1233'], ['black', 'Pure black', '#000']];

export function mount(root, app) {
  const s = getSettings(), admin = app.admin;
  const radio = (name, val, label, bg, cur) => `<label class="choice"><input type="radio" name="${name}" value="${val}" ${cur === val ? 'checked' : ''}><span class="box"><span class="swatch" style="background:${bg}"></span>${label}</span></label>`;

  root.innerHTML = `
    <header class="page-head"><div><p class="eyebrow">Control room</p><h1>Settings</h1></div></header>
    <form class="glass pad set-group" id="set-form">
      <fieldset style="border:0;padding:0;margin:0"><legend><h2>Theme</h2></legend>
        <div class="choices">${THEMES.map(([v, l, bg]) => radio('theme', v, l, bg, s.theme)).join('')}</div></fieldset>
      <fieldset style="border:0;padding:0;margin:0"><legend><h2>Background</h2></legend>
        <div class="choices">${BGS.map(([v, l, bg]) => radio('background', v, l, bg, s.background)).join('')}</div></fieldset>
      <h2>Motion</h2>
      <label class="switch"><input type="checkbox" role="switch" name="animations" ${s.animations ? 'checked' : ''}><span class="knob"></span>Animations and time travel effects</label>
      <div class="field" style="max-width:260px;margin:0"><label for="set-speed">Animation speed</label>
        <select id="set-speed" name="speed"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></div>
      <h2>Sound</h2>
      <label class="switch"><input type="checkbox" role="switch" name="sound" ${s.sound ? 'checked' : ''}><span class="knob"></span>Time travel sound effect</label>
      <p class="hint" style="margin:0">Plays a short synthesized sweep when you jump to another year. Nothing is downloaded.</p>
    </form>

    <section class="glass pad"><h2>Account</h2>
      <dl class="kv"><dt>Name</dt><dd>${esc(admin?.name || '')}</dd><dt>Email</dt><dd>${esc(admin?.email || '')}</dd><dt>Stored data</dt><dd>${storageUsageKB()} KB in this browser</dd></dl>
      <div class="card-actions"><button class="btn" data-action="logout">${icon('logout', 18)} Logout</button></div>
      <div class="notice notice-info small"><strong>About this login.</strong> It runs entirely in your browser. The password is hashed before saving, but anyone with access to this browser profile can read or change the stored data, so it is not secure authentication.</div>
    </section>

    <section class="glass pad"><h2>Data</h2>
      <p class="muted">Remove all events, notes, favourites and preferences stored by ChronoShift. Your admin account is kept.</p>
      <button class="btn btn-danger" id="clear-data">${icon('trash', 18)} Clear stored data</button></section>`;

  $('#set-speed', root).value = s.speed;
  const form = $('#set-form', root);
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', (e) => {
    const t = e.target;
    const patch = t.type === 'checkbox' ? { [t.name]: t.checked } : { [t.name]: t.value };
    const next = saveSettings(patch);
    applyAppearance(next);
    if (t.name === 'sound' && t.checked) playTone('up');
    toast('Setting saved.', 'success');
  });
  $('#clear-data', root).addEventListener('click', async () => {
    const counts = `${getList(KEYS.EVENTS).length} events, ${getList(KEYS.NOTES).length} notes and ${getList(KEYS.FAVS).length} favourite years`;
    const ok = await confirmDialog({ title: 'Clear all stored data?', text: `This permanently deletes ${counts}, plus your preferences. Your admin account stays. This cannot be undone.`, confirmLabel: 'Clear data' });
    if (!ok) return;
    clearUserData();
    applyAppearance(getSettings());
    app.state.year = currentYear();
    saveSettings({ year: app.state.year });
    document.dispatchEvent(new CustomEvent('chronoshift:year', { detail: { year: app.state.year, from: app.state.year, travel: false } }));
    toast('Stored data cleared.', 'success');
    app.refresh();
  });
}
