import { request, imageUrl, logout } from './cms-client.js';

const root = document.getElementById('cms-root');
const state = { config: null, collection: 'layanan', filter: 'all', search: '', entries: [], entry: null, uploads: new Map(), dirty: false, busy: false, urls: new Set() };
let sequence = 0;
let loadSequence = 0;
let toastTimer;
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(child));
  return node;
};
const menu = () => state.config.collections.find((item) => item.name === state.collection);
const fields = () => menu().files?.find((file) => file.name === state.entry.slug)?.fields || menu().fields;
const name = () => state.entry?.data?.[menu().identifier_field || 'judul'] || state.entry?.data?.nama || menu().files?.find((file) => file.name === state.entry?.slug)?.label || 'Konten baru';
const button = (text, onClick, className = '') => el('button', { type: 'button', class: className, onClick }, text);
function message(text, error = false) {
  const node = root.querySelector('#cms-message');
  node.textContent = text; node.className = `cms-message${error ? ' is-error' : ''}`; node.hidden = !text;
}
function notify(text) {
  clearTimeout(toastTimer);
  let node = document.getElementById('cms-notification');
  if (!node) { node = el('div', { id: 'cms-notification', class: 'cms-notification', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.append(node); }
  node.hidden = false;
  node.replaceChildren(el('span', { class: 'cms-notification-icon', 'aria-hidden': 'true' }, '✓'), el('span', {}, text), button('×', () => { node.hidden = true; }, 'cms-notification-close'));
  node.lastChild.setAttribute('aria-label', 'Tutup pemberitahuan');
  toastTimer = setTimeout(() => { node.hidden = true; }, 7000);
}
function setBusy(value) {
  state.busy = value;
  if (value) { const notification = document.getElementById('cms-notification'); if (notification) notification.hidden = true; clearTimeout(toastTimer); }
  root.querySelectorAll('button').forEach((node) => { node.disabled = value; });
  root.querySelectorAll('.cms-status-select').forEach((node) => { node.disabled = value; });
  root.querySelector('.cms-editor')?.toggleAttribute('inert', value);
}
function confirmAction({ title, description, subject, action, danger = false, returnFocus }) {
  if (document.getElementById('cms-confirm-dialog')) return Promise.resolve(false);
  return new Promise((resolve) => {
    const previousFocus = returnFocus || document.activeElement;
    const previousOverflow = document.documentElement.style.overflow;
    const cancel = button('Batal', () => dialog.close('cancel'));
    cancel.setAttribute('autofocus', '');
    const proceed = button(action, () => dialog.close('confirm'), danger ? 'cms-dialog-danger' : 'cms-dialog-primary');
    const dialog = el('dialog', { id: 'cms-confirm-dialog', class: 'cms-dialog', 'aria-labelledby': 'cms-dialog-title', 'aria-describedby': `${subject ? 'cms-dialog-subject ' : ''}cms-dialog-description` },
      el('div', { class: 'cms-dialog-body' }, el('span', { class: `cms-dialog-symbol${danger ? ' is-danger' : ''}`, 'aria-hidden': 'true' }, danger ? '!' : '↶'),
        el('h2', { id: 'cms-dialog-title' }, title), subject ? el('p', { id: 'cms-dialog-subject', class: 'cms-dialog-subject' }, subject) : null,
        el('p', { id: 'cms-dialog-description' }, description)), el('div', { class: 'cms-dialog-actions' }, cancel, proceed));
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.shiftKey && document.activeElement === cancel) { event.preventDefault(); proceed.focus(); }
      else if (!event.shiftKey && document.activeElement === proceed) { event.preventDefault(); cancel.focus(); }
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close('cancel');
    });
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = previousOverflow;
      dialog.remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      resolve(dialog.returnValue === 'confirm');
    }, { once: true });
    document.body.append(dialog); document.documentElement.style.overflow = 'hidden'; dialog.showModal();
  });
}
async function canLeave() {
  if (state.busy) return false;
  const leave = !state.dirty || await confirmAction({ title: 'Perubahan belum disimpan', description: 'Jika Anda keluar, perubahan terakhir pada formulir ini akan hilang.', action: 'Tinggalkan halaman', danger: true });
  if (leave) state.dirty = false;
  return leave;
}
function cleanup() { for (const url of state.urls) URL.revokeObjectURL(url); state.urls.clear(); state.uploads.clear(); }
function defaults(list) {
  return Object.fromEntries(list.filter((field) => field.name !== 'body').map((field) => [field.name,
    field.default ?? (field.widget === 'object' ? defaults(field.fields) : ['list', 'daftarNama', 'daftarTeks'].includes(field.widget) ? [] : field.widget === 'boolean' ? false : field.widget === 'number' ? null : field.widget === 'datetime' ? new Date().toISOString().slice(0, 10) : '')]));
}
function shell() {
  root.replaceChildren();
  const nav = el('nav', { class: 'cms-nav', 'aria-label': 'Jenis konten' });
  for (const collection of state.config.collections) nav.append(button(collection.label, async () => { if (await canLeave()) { state.collection = collection.name; state.filter = 'all'; state.search = ''; showList(); } }, state.collection === collection.name ? 'is-active' : ''));
  const top = el('header', { class: 'cms-header' }, el('a', { href: './', class: 'cms-brand', onClick: async (event) => { event.preventDefault(); if (await canLeave()) showList(); } }, el('span', { 'aria-hidden': 'true' }, 'W'), el('strong', {}, 'Panel Konten', el('small', {}, 'Kelurahan Walian'))), el('div', { class: 'cms-account' }, el('a', { href: state.config.site_url, onClick: async (event) => { event.preventDefault(); if (await canLeave()) { state.dirty = false; location.assign(state.config.site_url); } } }, 'Lihat website'), button('Keluar', async () => { if (await canLeave()) logout(); })));
  root.append(top);
  if (window.WALIAN_DEMO) root.append(el('p', { class: 'cms-demo' }, 'Mode uji — perubahan hanya tersimpan selama pratinjau lokal ini berjalan.'));
  root.append(nav, el('main', { class: 'cms-main' }, el('p', { id: 'cms-message', class: 'cms-message', role: 'status', 'aria-live': 'polite', hidden: true }), el('div', { id: 'cms-content' })));
}
async function showList() {
  const loadId = ++loadSequence, collection = state.collection;
  cleanup(); state.entry = null; state.dirty = false; shell();
  const area = root.querySelector('#cms-content');
  area.append(el('p', {}, 'Memuat konten…'));
  try {
    const result = await request('list', { collection });
    if (loadId !== loadSequence) return;
    state.entries = result.entries; drawList();
  } catch (error) { if (loadId === loadSequence) { area.replaceChildren(button('Coba lagi', showList)); message(error.message, true); } }
}
function drawList() {
  const area = root.querySelector('#cms-content'); area.replaceChildren();
  const heading = el('div', { class: 'cms-heading' }, el('div', {}, el('h1', {}, menu().label), el('p', {}, menu().description)));
  if (menu().create) heading.append(button('+ Tambah ' + (menu().label_singular || 'konten'), () => openEntry(null), 'cms-primary'));
  const filter = el('div', { class: 'cms-filters', role: 'group', 'aria-label': 'Status konten' });
  const search = el('input', { type: 'search', placeholder: 'Cari konten…', 'aria-label': 'Cari konten', value: state.search, onInput: (e) => { state.search = e.target.value; drawRows(); } });
  for (const [value, label] of [['all', 'Semua'], ['draft', 'Draf'], ['published', 'Terbit']]) {
    const count = state.entries.filter((item) => value === 'all' || item.status === value).length;
    filter.append(el('button', { type: 'button', 'aria-pressed': state.filter === value, onClick: () => { state.filter = value; filter.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.textContent.startsWith(label))); drawRows(); } }, `${label} (${count})`));
  }
  area.append(heading, el('div', { class: 'cms-list-tools' }, filter, search), el('div', { id: 'cms-rows', class: 'cms-rows' })); drawRows();
}
function drawRows() {
  const rows = root.querySelector('#cms-rows'); rows.replaceChildren();
  const items = state.entries.filter((item) => (state.filter === 'all' || item.status === state.filter) && `${item.title} ${item.summary}`.toLocaleLowerCase('id').includes(state.search.toLocaleLowerCase('id')));
  if (!items.length) rows.append(el('p', { class: 'cms-empty' }, state.search ? 'Tidak ada konten yang cocok dengan pencarian.' : 'Belum ada konten pada status ini.'));
  for (const item of items) {
    const status = el('select', { class: `cms-status-select ${item.status}`, 'aria-label': `Status ${item.title}`, onChange: (event) => changeStatus(item, event.target.value, event.target) }, el('option', { value: 'draft', disabled: !item.deleted && !item.revision && (menu().files || menu().delete === false) }, 'Draf'), el('option', { value: 'published' }, 'Terbit'));
    status.value = item.status;
    if (item.status === 'draft' && item.published && !item.deleted && !menu().files && menu().delete !== false) status.append(el('option', { value: 'withdraw' }, 'Tarik ke draf'));
    const actions = el('div', { class: 'cms-row-actions' }, button('Ubah', () => openEntry(item.slug)));
    if (menu().delete !== false && !menu().files) actions.append(button('Hapus', () => removeEntry(item), 'cms-danger-text'));
    const hint = item.withdrawal && item.published ? 'Penarikan ke draf menunggu pemeriksaan. Klik Lanjutkan penarikan.' : item.deleted ? 'Penghapusan menunggu pemeriksaan. Klik Lanjutkan hapus.' : item.status === 'draft' && item.published ? 'Ada revisi draf — versi terbit masih tampil.' : item.withdrawn ? 'Sudah ditarik dari website; isinya tetap tersimpan.' : '';
    rows.append(el('article', { class: 'cms-row' }, el('div', { class: 'cms-row-copy' }, el('h2', {}, item.title), item.summary ? el('p', {}, item.summary) : null, hint ? el('small', {}, hint) : null), status, actions));
    if (item.deleted) actions.prepend(button(item.withdrawal ? 'Lanjutkan penarikan' : 'Lanjutkan hapus', () => finishRemoval(item), 'cms-secondary'));
  }
  if (state.busy) setBusy(true);
}
const entryParams = (item) => ({ collection: state.collection, slug: item.slug, revision: item.revision, publishedSha: item.publishedSha });
async function finishRemoval(item) {
  if (state.busy) return;
  setBusy(true); message('Memeriksa perubahan…');
  try { const result = await request('publish', entryParams(item), 'POST'); await showList(); notify(result.message); }
  catch (error) { message(error.message + ` Untuk melanjutkan, klik ${item.withdrawal ? 'Lanjutkan penarikan' : 'Lanjutkan hapus'}.`, true); }
  finally { setBusy(false); }
}
async function changeStatus(item, value, control) {
  if (state.busy) return;
  if (value === 'withdraw') value = 'draft';
  if (value === 'draft' && !item.published) { drawRows(); return; }
  if (value === 'published' && item.deleted) { drawRows(); message('Selesaikan atau batalkan penarikan/penghapusan dahulu melalui tombol Ubah.', true); return; }
  if (value === 'published' && item.status === 'published') return;
  if (value === 'draft' && !await confirmAction({ title: 'Tarik ke draf?', subject: item.title, description: 'Konten akan ditarik dari website setelah proses selesai. Isinya tetap tersimpan di sini dan dapat diterbitkan kembali kapan saja.', action: 'Tarik ke draf', returnFocus: control })) { if (control?.isConnected) control.value = item.status; return; }
  if (value === 'published') {
    const listFields = menu().files?.find((file) => file.name === item.slug)?.fields || menu().fields;
    const errors = errorsFor(listFields, item.data);
    if (errors.length) { drawRows(); message('Isian belum lengkap. Klik Ubah: ' + errors.slice(0, 3).join(' '), true); return; }
  }
  setBusy(true); message(value === 'draft' ? 'Menarik konten ke draf…' : 'Memeriksa penerbitan…');
  let current = item;
  try {
    if (value === 'draft' && !item.withdrawal) current = await request('withdraw', entryParams(item), 'POST');
    if (value === 'published' && (item.withdrawn || item.warning)) current = await request('save', { ...entryParams(item), data: item.data }, 'POST');
    const result = await request('publish', entryParams(current), 'POST');
    await showList(); notify(result.message);
  } catch (error) { await showList(); message(error.message + (value === 'draft' && current.withdrawal ? ' Klik Lanjutkan penarikan untuk mencoba lagi.' : ''), true); }
  finally { setBusy(false); }
}
async function removeEntry(item) {
  if (state.busy) return;
  if (!await confirmAction({ title: item.published ? 'Hapus konten?' : 'Hapus draf?', subject: item.title || name(), description: (state.dirty ? 'Isian yang belum disimpan juga akan dibuang. ' : '') + (item.published ? 'Konten akan dihapus dari website setelah proses selesai.' : 'Isian draf ini akan dihapus dari daftar konten.'), action: item.published ? 'Hapus konten' : 'Hapus draf', danger: true })) return;
  setBusy(true); message('Menghapus konten…');
  let prepared = false;
  try {
    if (!item.published) { await request('discard', entryParams(item), 'POST'); state.dirty = false; await showList(); notify('Draf berhasil dihapus.'); }
    else {
      const current = item.deleted && !item.withdrawal ? item : await request('delete', entryParams(item), 'POST');
      prepared = true;
      state.dirty = false;
      const result = await request('publish', entryParams(current), 'POST');
      await showList(); notify(result.message);
    }
  } catch (error) { if (prepared || !state.entry) await showList(); message(error.message + (prepared ? ' Klik Lanjutkan hapus untuk mencoba lagi.' : ''), true); }
  finally { setBusy(false); }
}
async function openEntry(slug) {
  if (!await canLeave()) return;
  const loadId = ++loadSequence, collection = state.collection;
  cleanup(); state.dirty = false;
  try {
    const entry = slug ? await request('entry', { collection, slug }) : { slug: '', collection, status: 'draft', published: false, revision: null, publishedSha: null, data: defaults(menu().fields) };
    if (loadId !== loadSequence) return;
    state.entry = entry;
    if (!slug) {
      const orders = state.entries.map((item) => Number(item.data?.urutan)).filter(Number.isFinite);
      if ('urutan' in state.entry.data) state.entry.data.urutan = Math.max(0, ...orders) + 1;
    }
    drawEditor();
    if (state.entry.warning) message(state.entry.warning, true);
  } catch (error) { if (loadId === loadSequence) message(error.message, true); }
}
function fieldControl(field, parent, key, path) {
  const id = `cms-field-${++sequence}`;
  const box = el('div', { class: `cms-field cms-field-${field.widget}` });
  if (field.widget === 'hidden') return document.createDocumentFragment();
  const set = (value) => { parent[key] = value; state.dirty = true; };
  const label = el('label', { for: id }, field.label || field.name, field.required !== false ? el('span', { class: 'cms-required' }, ' *') : null);
  const hintId = `${id}-hint`;
  const hint = field.hint ? el('small', { id: hintId, class: 'cms-hint' }, field.hint) : null;
  box.append(label);
  if (field.widget === 'object') {
    label.removeAttribute('for');
    const optional = field.required === false;
    if (!parent[key] && !optional) parent[key] = defaults(field.fields);
    if (optional) box.append(el('label', { class: 'cms-checkbox' }, el('input', { type: 'checkbox', checked: !!parent[key], onChange: (event) => { set(event.target.checked ? defaults(field.fields) : null); drawEditor(); } }), 'Gunakan ' + (field.label || field.name)));
    if (parent[key]) for (const child of field.fields) box.append(fieldControl(child, parent[key], child.name, `${path}.${child.name}`));
  } else if (['list', 'daftarNama', 'daftarTeks'].includes(field.widget)) {
    label.removeAttribute('for');
    if (!Array.isArray(parent[key])) parent[key] = [];
    const list = parent[key];
    const simple = !!field.field || ['daftarNama', 'daftarTeks'].includes(field.widget);
    const childField = field.field || { label: field.label, widget: 'string', required: false };
    const redraw = () => { state.dirty = true; drawEditor(); };
    list.forEach((item, index) => {
      const row = el('section', { class: 'cms-list-item', 'aria-label': `${field.label} ${index + 1}` });
      const actions = el('div', { class: 'cms-item-actions' }, el('strong', {}, `${field.label} ${index + 1}`));
      if (field.allow_add !== false) {
        if (index > 0) actions.append(button('Naik', () => { [list[index - 1], list[index]] = [list[index], list[index - 1]]; redraw(); }));
        if (index < list.length - 1) actions.append(button('Turun', () => { [list[index + 1], list[index]] = [list[index], list[index + 1]]; redraw(); }));
        actions.append(button('Hapus', () => { list.splice(index, 1); redraw(); }, 'cms-danger-text'));
      }
      row.append(actions);
      if (simple) {
        const control = fieldControl({ ...childField, label: `${field.label} ${index + 1}` }, list, index, `${path}.${index}`);
        control.querySelector('label')?.classList.add('cms-sr-only'); row.append(control);
      }
      else for (const child of field.fields || []) row.append(fieldControl(child, item, child.name, `${path}.${index}.${child.name}`));
      box.append(row);
    });
    if (field.allow_add !== false && (!field.max || list.length < field.max)) box.append(button('+ Tambah ' + (field.label || 'item'), () => { list.push(simple ? '' : defaults(field.fields)); redraw(); }, 'cms-add'));
    if (!list.length) box.append(el('p', { class: 'cms-hint' }, 'Belum ada item.'));
  } else if (field.widget === 'boolean') {
    box.replaceChildren(el('label', { class: 'cms-checkbox', for: id }, el('input', { id, type: 'checkbox', checked: parent[key] === true, onChange: (e) => set(e.target.checked) }), field.label));
  } else if (field.widget === 'select') {
    const input = el('select', { id, 'aria-describedby': hint ? hintId : null, onChange: (e) => set(e.target.value) });
    input.append(el('option', { value: '' }, 'Pilih ' + field.label.toLowerCase()));
    for (const item of field.options || []) input.append(el('option', { value: typeof item === 'object' ? item.value : item }, typeof item === 'object' ? item.label : item));
    input.value = parent[key] || ''; box.append(input);
  } else if (field.widget === 'image') {
    const preview = el('img', { class: 'cms-image', alt: 'Foto yang dipilih', hidden: true });
    const existing = parent[key];
    if (existing) {
      const pending = state.uploads.get(existing);
      if (pending) { preview.src = pending.url; preview.hidden = false; }
      else if (/^\/uploads\//.test(existing) && state.entry.slug) imageUrl({ collection: state.collection, slug: state.entry.slug, path: existing, draft: state.entry.revision ? '1' : '0' }).then((url) => { state.urls.add(url); if (preview.isConnected) { preview.src = url; preview.hidden = false; } }).catch(() => { if (preview.isConnected) box.append(el('small', { class: 'cms-hint' }, 'Foto tersimpan, tetapi pratinjaunya belum dapat dimuat.')); });
      else if (/^(\/|https?:\/\/)/.test(existing)) { preview.src = existing.startsWith('/') ? new URL(existing, state.config.site_url) : existing; preview.hidden = false; }
    }
    const input = el('input', { id, type: 'file', accept: 'image/jpeg,image/png,image/webp', onChange: async (event) => {
      const file = event.target.files[0]; if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { event.target.value = ''; message('Pilih foto JPEG, PNG, atau WebP maksimal 5 MB.', true); return; }
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
      const path = `/uploads/${crypto.randomUUID()}.${ext}`;
      setBusy(true); state.dirty = true;
      try {
      const content = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
      const url = URL.createObjectURL(file); state.urls.add(url); state.uploads.set(path, { path: 'public' + path, content, url }); set(path); drawEditor();
      } catch { message('Foto belum dapat dibaca. Pilih ulang file foto.', true); } finally { setBusy(false); }
    } });
    box.append(preview, input, existing ? button('Hapus foto dari isian', () => { set(''); drawEditor(); }, 'cms-danger-text') : null);
  } else {
    const multiline = ['text', 'markdown'].includes(field.widget);
    const input = el(multiline ? 'textarea' : 'input', { id, ...(multiline ? { rows: 4 } : { type: field.widget === 'number' ? 'number' : field.widget === 'datetime' ? 'date' : 'text' }), 'aria-describedby': hint ? hintId : null, ...(field.widget === 'number' ? { step: field.value_type === 'float' ? 'any' : '1', min: field.min, max: field.max } : {}), onInput: (e) => set(field.widget === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value) });
    input.value = parent[key] ?? ''; box.append(input);
  }
  if (hint) box.append(hint);
  return box;
}
function normalize(list, data) {
  for (const field of list) {
    const value = data[field.name];
    if (field.widget === 'object' && value) normalize(field.fields, value);
    if (field.widget === 'list' && Array.isArray(value)) {
      if (field.fields) for (const item of value) normalize(field.fields, item);
      else data[field.name] = value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (['daftarNama', 'daftarTeks'].includes(field.widget) && Array.isArray(value)) data[field.name] = value.map((item) => String(item).trim()).filter(Boolean);
    // The website represents a closed day with null, not an empty string.
    if (['buka', 'tutup'].includes(field.name) && value === '') data[field.name] = null;
    if (field.widget === 'object' && field.name === 'istirahat' && value && !value.mulai && !value.selesai) data[field.name] = null;
  }
}
function errorsFor(list, data, prefix = '') {
  const errors = [];
  for (const field of list) {
    const value = data[field.name], label = prefix + (field.label || field.name);
    if (field.widget === 'hidden') continue;
    if (field.required !== false && (value == null || (typeof value === 'string' && !value.trim()))) errors.push(label + ' perlu diisi.');
    if (field.pattern && value != null && value !== '' && !new RegExp('^(?:' + field.pattern[0] + ')$').test(String(value))) errors.push(`${label}: ${field.pattern[1]}`);
    if (field.widget === 'number' && value != null && (!Number.isFinite(value) || (field.min != null && value < field.min) || (field.max != null && value > field.max))) errors.push(label + ' berada di luar batas yang diizinkan.');
    if (field.widget === 'object' && value) errors.push(...errorsFor(field.fields, value, label + ' — '));
    if (field.widget === 'list' && Array.isArray(value)) {
      if (field.min && value.length < field.min) errors.push(`${label}: minimal ${field.min} item.`);
      if (field.max && value.length > field.max) errors.push(`${label}: maksimal ${field.max} item.`);
      if (field.fields) value.forEach((item, i) => errors.push(...errorsFor(field.fields, item, `${label} ${i + 1} — `)));
    }
  }
  return errors;
}
function slugify(text) { return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, ''); }
async function save(publish = false) {
  if (state.busy) return;
  if (!state.dirty && state.entry.published && !state.entry.revision && !state.entry.warning) { message('Konten ini sudah terbit. Ubah isian dahulu untuk membuat revisi.'); return; }
  const data = structuredClone(state.entry.data); normalize(fields(), data);
  if (publish) { const errors = errorsFor(fields(), data); if (errors.length) { message(errors.slice(0, 4).join(' '), true); return; } }
  const slug = state.entry.slug || slugify(data[menu().identifier_field || 'judul'] || data.nama || '');
  if (!slug) { message('Isi nama atau judul dahulu agar draf mudah ditemukan.', true); return; }
  setBusy(true); message(publish ? 'Menyimpan dan memeriksa konten…' : 'Menyimpan draf…');
  try {
    if (!publish || state.dirty || !state.entry.revision || state.entry.warning || state.entry.withdrawn) {
      const uploads = [...state.uploads.entries()].filter(([path]) => JSON.stringify(data).includes(path)).map(([, upload]) => ({ path: upload.path, content: upload.content }));
      const result = await request('save', { collection: state.collection, slug, data, revision: state.entry.revision, publishedSha: state.entry.publishedSha, uploads }, 'POST');
      state.entry = result; state.dirty = false; cleanup(); drawEditor();
      if (!publish) { await showList(); notify('Draf berhasil disimpan.'); if (result.warning) message(result.warning, true); }
      else message(result.warning || 'Draf sudah tersimpan. Memeriksa penerbitan…', !!result.warning);
    }
    if (publish) {
      const result = await request('publish', { collection: state.collection, slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST');
      await showList(); notify(result.message);
    }
  } catch (error) { message(error.message, true); } finally { setBusy(false); }
}
async function discard() {
  if (!await confirmAction({ title: 'Buang draf?', subject: name(), description: state.entry.published ? 'Revisi draf akan dibuang. Versi yang sudah terbit tetap tampil di website.' : 'Isian draf ini akan dihapus dari daftar konten.', action: 'Buang draf', danger: true })) return;
  setBusy(true);
  try { await request('discard', { collection: state.collection, slug: state.entry.slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST'); await showList(); message('Draf dibuang.'); }
  catch (error) { message(error.message, true); } finally { setBusy(false); }
}
async function deletePublished() {
  await removeEntry(state.entry);
}
function drawEditor() {
  shell(); const area = root.querySelector('#cms-content');
  const actions = el('div', { class: 'cms-editor-actions' });
  if (!state.entry.deleted) actions.append(button('Simpan draf', () => save(), 'cms-secondary'));
  actions.append(button(state.entry.deleted ? state.entry.withdrawal ? 'Tarik ke draf' : 'Terbitkan penghapusan' : 'Terbitkan', async () => {
    if (state.entry.deleted) await finishRemoval(state.entry);
    else await save(true);
  }, 'cms-primary'));
  const header = el('div', { class: 'cms-editor-bar' }, button('← Daftar', async () => { if (await canLeave()) showList(); }), el('div', { class: 'cms-editor-title' }, el('h1', {}, name()), el('span', { class: 'cms-badge ' + state.entry.status }, state.entry.status === 'draft' ? 'Draf' : 'Terbit')), actions);
  area.append(header, el('p', { class: 'cms-editor-help' }, state.entry.published ? 'Revisi disimpan sebagai draf. Versi terbit tetap tampil sampai revisi diterbitkan.' : 'Simpan draf untuk melanjutkan nanti. Terbitkan jika semua isian sudah benar.'));
  if (state.entry.deleted) area.append(el('p', { class: 'cms-empty' }, state.entry.withdrawal ? 'Konten akan ditarik dari website setelah pemeriksaan selesai. Isinya tetap tersedia sebagai draf.' : 'Draf ini akan menghapus konten dari website setelah diterbitkan.'));
  else {
    const form = el('form', { class: 'cms-editor', noValidate: true, onSubmit: (e) => { e.preventDefault(); save(); } });
    for (const field of fields()) form.append(fieldControl(field, state.entry.data, field.name, field.name));
    area.append(form);
  }
  const bottom = el('div', { class: 'cms-editor-bottom' });
  if (state.entry.revision) bottom.append(button('Buang draf', discard, 'cms-danger-text'));
  if (state.entry.published && menu().delete !== false && !menu().files) bottom.append(button('Hapus konten', deletePublished, 'cms-danger-text'));
  area.append(bottom);
  if (state.busy) setBusy(true);
}

window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
export async function start() {
  root.hidden = false;
  try { state.config = await request('config'); document.getElementById('panel').hidden = true; await showList(); }
  catch (error) { document.getElementById('panel').hidden = true; root.replaceChildren(el('p', { class: 'cms-message is-error', role: 'alert' }, error.message), button('Coba lagi', start), button('Keluar', logout)); }
}
