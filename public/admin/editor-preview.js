// Tampilan saja: membaca isian editor tanpa menyimpan atau menerbitkan konten.
export function createEditorPreview({ area, header, form, collection, getTitle, getData, fields, view }) {
  const layout = document.createElement('div');
  layout.className = 'cms-editor-layout';
  const panel = document.createElement('aside');
  panel.id = 'cms-editor-preview';
  panel.className = 'cms-preview-panel';
  panel.setAttribute('aria-labelledby', 'cms-preview-heading');
  const heading = document.createElement('div');
  heading.className = 'cms-preview-heading';
  const title = document.createElement('h2');
  title.id = 'cms-preview-heading';
  title.textContent = 'Pratinjau';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Tutup pratinjau';
  heading.append(title, close);
  const help = document.createElement('p');
  help.className = 'cms-preview-help';
  help.textContent = 'Mengikuti isian Anda. Simpan draf untuk menyimpan perubahan. Tampilan akhir mengikuti halaman website.';
  const frame = document.createElement('iframe');
  frame.className = 'cms-preview-frame';
  frame.title = 'Pratinjau isi konten';
  // Teks pengguna selalu dibuat melalui textContent; skrip dinonaktifkan.
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.srcdoc = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="./preview.css?v=20261010_ui02"></head><body><main class="nc-preview-root"></main></body></html>';
  panel.append(heading, help, frame);
  layout.append(form, panel);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cms-preview-toggle';
  toggle.setAttribute('aria-controls', panel.id);
  header.querySelector('.cms-editor-actions').prepend(toggle);
  const desktop = matchMedia('(min-width: 1000px)');
  let timer;
  const isOpen = () => view.open ?? desktop.matches;
  function updateVisibility() {
    const open = isOpen();
    panel.hidden = !open;
    layout.classList.toggle('is-preview-open', open);
    toggle.textContent = open ? 'Sembunyikan pratinjau' : 'Buka pratinjau';
    toggle.setAttribute('aria-expanded', String(open));
    if (open) render();
  }
  function hide() { view.open = false; updateVisibility(); toggle.focus({ preventScroll: true }); }
  close.addEventListener('click', hide);
  toggle.addEventListener('click', () => {
    view.open = !isOpen(); updateVisibility();
    if (view.open && !desktop.matches) { close.focus({ preventScroll: true }); header.scrollIntoView({ block: 'start' }); }
  });
  const escape = event => { if (event.key === 'Escape' && isOpen() && !document.querySelector('dialog[open]')) { event.preventDefault(); hide(); } };
  area.addEventListener('keydown', escape);
  function render() {
    const doc = frame.contentDocument;
    const content = doc?.querySelector('main');
    if (!content || panel.hidden) return;
    const node = (tag, className, ...children) => {
      const item = doc.createElement(tag);
      if (className) item.className = className;
      for (const child of children.flat()) if (child != null) item.append(child instanceof doc.defaultView.Node ? child : doc.createTextNode(String(child)));
      return item;
    };
    const data = getData();
    const displayField = (field, value, path) => {
      if (field.widget === 'hidden') return null;
      const section = node('section', 'cms-preview-section', node('h3', '', field.label || field.name));
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) section.append(node('p', 'teks-kosong', 'Belum diisi.'));
      else if (field.widget === 'object') section.append(...field.fields.map(child => displayField(child, value[child.name], `${path}.${child.name}`)).filter(Boolean));
      else if (Array.isArray(value)) {
        const list = node('ol', 'cms-preview-list');
        value.forEach((item, index) => {
          const row = node('li', '');
          if (field.fields) row.append(...field.fields.map(child => displayField(child, item[child.name], `${path}.${index}.${child.name}`)).filter(Boolean));
          else row.textContent = String(item);
          list.append(row);
        });
        section.append(list);
      } else if (field.widget === 'image') {
        const input = [...form.querySelectorAll('input[type="file"]')].find(input => input.dataset.imageField === path);
        const src = input?.closest('.cms-field')?.querySelector('.cms-image:not([hidden])')?.src;
        if (src && /^(https?:|blob:)/.test(src)) { const image = node('img', 'cms-preview-image'); image.src = src; image.alt = field.label || 'Foto'; section.append(image); }
        else section.append(node('p', 'teks-kosong', 'Foto akan terlihat setelah pratinjau gambar dimuat.'));
      } else {
        const option = field.options?.find(option => typeof option === 'object' && option.value === value);
        section.append(node('p', 'cms-preview-text', typeof value === 'boolean' ? value ? 'Ya' : 'Tidak' : option?.label || String(value)));
      }
      return section;
    };
    if (collection === 'layanan') {
      const details = node('div', 'grid-layanan-detail');
      for (const [label, key, tag, className] of [['Persyaratan', 'persyaratan', 'ul', 'daftar-syarat'], ['Alur pengurusan', 'alur', 'ol', 'daftar-alur']]) {
        const list = node(tag, className, ...(data[key] || []).map(value => node('li', '', value)));
        details.append(node('section', 'kolom-layanan', node('h3', 'label-seksi-layanan', label), list.children.length ? list : node('p', 'teks-kosong', 'Informasi sedang disiapkan.')));
      }
      const card = node('article', 'kartu-layanan-preview', node('div', 'kartu-layanan-header', node('div', 'kartu-layanan-teks', node('h1', 'judul-layanan', data.judul || 'Nama layanan'), node('p', 'ringkasan-layanan', data.ringkasan || 'Ringkasan layanan'), data.unggulan ? node('span', 'lencana-unggulan', 'Tampil di Beranda') : null)), node('div', 'kartu-layanan-body', details, data.body ? node('section', 'catatan-layanan', node('h3', 'label-seksi-layanan', 'Catatan tambahan'), node('p', 'cms-preview-text', data.body)) : null));
      const info = node('div', 'nc-info-box', ...fields.filter(field => ['ikon', 'urutan', 'diperbarui'].includes(field.name)).map(field => displayField(field, data[field.name], field.name)).filter(Boolean));
      content.replaceChildren(card, info);
    } else {
      content.replaceChildren(node('h1', 'cms-preview-title', getTitle()), ...fields.map(field => displayField(field, data[field.name], field.name)).filter(Boolean));
    }
  }
  frame.addEventListener('load', () => {
    render();
    frame.contentDocument?.addEventListener('keydown', escape);
  });
  const refresh = () => { clearTimeout(timer); timer = setTimeout(render, 120); };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  const images = new MutationObserver(refresh);
  images.observe(form, { subtree: true, attributes: true, attributeFilter: ['src', 'hidden'] });
  const resize = new ResizeObserver(() => area.style.setProperty('--cms-editor-bar-height', `${header.getBoundingClientRect().height}px`));
  resize.observe(header);
  desktop.addEventListener('change', updateVisibility);
  updateVisibility();
  return { layout, destroy() { clearTimeout(timer); resize.disconnect(); images.disconnect(); desktop.removeEventListener('change', updateVisibility); area.removeEventListener('keydown', escape); } };
}
