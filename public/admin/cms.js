import { request, imageUrl, logout } from './cms-client.js';

const root = document.getElementById('cms-root');
const state = { config: null, collection: 'layanan', filter: 'all', search: '', entries: [], entry: null, uploads: new Map(), dirty: false, busy: false, urls: new Set() };
let sequence = 0;
let loadSequence = 0;
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
function setBusy(value) {
  state.busy = value;
  root.querySelectorAll('button').forEach((node) => { node.disabled = value; });
  root.querySelector('.cms-editor')?.toggleAttribute('inert', value);
}
function canLeave() { return !state.dirty || confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?'); }
function cleanup() { for (const url of state.urls) URL.revokeObjectURL(url); state.urls.clear(); state.uploads.clear(); }
function defaults(list) {
  return Object.fromEntries(list.filter((field) => field.name !== 'body').map((field) => [field.name,
    field.default ?? (field.widget === 'object' ? defaults(field.fields) : ['list', 'daftarNama', 'daftarTeks'].includes(field.widget) ? [] : field.widget === 'boolean' ? false : field.widget === 'number' ? null : field.widget === 'datetime' ? new Date().toISOString().slice(0, 10) : '')]));
}
function shell() {
  root.replaceChildren();
  const nav = el('nav', { class: 'cms-nav', 'aria-label': 'Jenis konten' });
  for (const collection of state.config.collections) nav.append(button(collection.label, () => { if (canLeave()) { state.collection = collection.name; state.filter = 'all'; state.search = ''; showList(); } }, state.collection === collection.name ? 'is-active' : ''));
  const top = el('header', { class: 'cms-header' }, el('a', { href: './', class: 'cms-brand', onClick: (event) => { event.preventDefault(); if (canLeave()) showList(); } }, el('span', { 'aria-hidden': 'true' }, 'W'), el('strong', {}, 'Panel Konten', el('small', {}, 'Kelurahan Walian'))), el('div', { class: 'cms-account' }, el('a', { href: state.config.site_url, target: '_blank', rel: 'noopener' }, 'Lihat website'), button('Keluar', () => { if (canLeave()) logout(); })));
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
  for (const item of items) rows.append(el('article', { class: 'cms-row' }, el('div', { class: 'cms-row-copy' }, el('h2', {}, item.title), item.summary ? el('p', {}, item.summary) : null, item.status === 'draft' && item.published ? el('small', {}, item.deleted ? 'Draf penghapusan — versi terbit masih tampil.' : 'Ada revisi draf — versi terbit masih tampil.') : null), el('span', { class: `cms-badge ${item.status}` }, item.status === 'draft' ? 'Draf' : 'Terbit'), button('Ubah', () => openEntry(item.slug))));
}
async function openEntry(slug) {
  if (!canLeave()) return;
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
    if (!publish || state.dirty || !state.entry.revision || state.entry.warning) {
      const uploads = [...state.uploads.entries()].filter(([path]) => JSON.stringify(data).includes(path)).map(([, upload]) => ({ path: upload.path, content: upload.content }));
      const result = await request('save', { collection: state.collection, slug, data, revision: state.entry.revision, publishedSha: state.entry.publishedSha, uploads }, 'POST');
      state.entry = result; state.dirty = false; cleanup(); drawEditor();
      message(result.warning || 'Draf tersimpan. Konten belum berubah di website.', !!result.warning);
    }
    if (publish) {
      const result = await request('publish', { collection: state.collection, slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST');
      await showList(); message(result.message);
    }
  } catch (error) { message(error.message, true); } finally { setBusy(false); }
}
async function discard() {
  if (!confirm('Buang draf ini? Versi yang sudah terbit tetap tersedia.')) return;
  setBusy(true);
  try { await request('discard', { collection: state.collection, slug: state.entry.slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST'); await showList(); message('Draf dibuang.'); }
  catch (error) { message(error.message, true); } finally { setBusy(false); }
}
async function deletePublished() {
  if (!confirm('Siapkan penghapusan konten ini? Konten tetap tampil sampai penghapusan diterbitkan.')) return;
  setBusy(true);
  try { state.entry = await request('delete', { collection: state.collection, slug: state.entry.slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST'); state.dirty = false; drawEditor(); message('Penghapusan disimpan sebagai draf. Klik Terbitkan penghapusan setelah pemeriksaan selesai.'); }
  catch (error) { message(error.message, true); } finally { setBusy(false); }
}
function drawEditor() {
  shell(); const area = root.querySelector('#cms-content');
  const actions = el('div', { class: 'cms-editor-actions' });
  if (!state.entry.deleted) actions.append(button('Simpan draf', () => save(), 'cms-secondary'));
  actions.append(button(state.entry.deleted ? 'Terbitkan penghapusan' : 'Terbitkan', async () => {
    if (state.entry.deleted) { setBusy(true); try { const result = await request('publish', { collection: state.collection, slug: state.entry.slug, revision: state.entry.revision, publishedSha: state.entry.publishedSha }, 'POST'); await showList(); message(result.message); } catch (error) { message(error.message, true); } finally { setBusy(false); } }
    else await save(true);
  }, 'cms-primary'));
  const header = el('div', { class: 'cms-editor-bar' }, button('← Daftar', () => { if (canLeave()) showList(); }), el('div', { class: 'cms-editor-title' }, el('h1', {}, name()), el('span', { class: 'cms-badge ' + state.entry.status }, state.entry.status === 'draft' ? 'Draf' : 'Terbit')), actions);
  area.append(header, el('p', { class: 'cms-editor-help' }, state.entry.published ? 'Revisi disimpan sebagai draf. Versi terbit tetap tampil sampai revisi diterbitkan.' : 'Simpan draf untuk melanjutkan nanti. Terbitkan jika semua isian sudah benar.'));
  if (state.entry.deleted) area.append(el('p', { class: 'cms-empty' }, 'Draf ini akan menghapus konten dari website setelah diterbitkan.'));
  else {
    const form = el('form', { class: 'cms-editor', noValidate: true, onSubmit: (e) => { e.preventDefault(); save(); } });
    for (const field of fields()) form.append(fieldControl(field, state.entry.data, field.name, field.name));
    area.append(form);
  }
  const bottom = el('div', { class: 'cms-editor-bottom' });
  if (state.entry.revision) bottom.append(button('Buang draf', discard, 'cms-danger-text'));
  else if (state.entry.published && menu().delete !== false && !menu().files) bottom.append(button('Hapus konten', deletePublished, 'cms-danger-text'));
  area.append(bottom);
  if (state.busy) setBusy(true);
}

window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
export async function start() {
  root.hidden = false;
  try { state.config = await request('config'); document.getElementById('panel').hidden = true; await showList(); }
  catch (error) { document.getElementById('panel').hidden = true; root.replaceChildren(el('p', { class: 'cms-message is-error', role: 'alert' }, error.message), button('Coba lagi', start), button('Keluar', logout)); }
}
