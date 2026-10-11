// Pengelompokan tampilan saja. Semua kontrol tetap berada pada form yang sama.
const sections = {
  profil: [
    ['umum', 'Umum', 'Ringkasan profil dan tanggal pemeriksaan data.', ['ringkasan', 'diperbarui']],
    ['pemerintahan', 'Pemerintahan', 'Lurah dan susunan organisasi kelurahan.', ['lurah', 'strukturOrganisasi']],
    ['wilayah', 'Wilayah', 'Sumber data dan informasi setiap lingkungan.', ['sumberData', 'lingkungan']],
    ['visi-misi', 'Visi & Misi', 'Arah dan tujuan pembangunan kelurahan.', ['visi', 'misi', 'sumberVisiMisi']],
    ['program', 'Program', 'Daftar program unggulan yang ditampilkan di Profil.', ['programUnggulan']],
  ],
  situs: [
    ['identitas', 'Identitas', 'Nama wilayah dan kredit website.', ['namaKelurahan', 'kecamatan', 'kota', 'provinsi', 'kredit']],
    ['kontak', 'Lokasi & Kontak', 'Alamat kantor, titik peta, dan kontak resmi.', ['alamat', 'koordinat', 'googleMapsUrl', 'whatsapp', 'email']],
    ['jadwal', 'Jam Layanan', 'Jadwal mingguan dan tanggal libur pelayanan.', ['jamLayanan']],
    ['tautan', 'Tautan', 'Media sosial resmi dan tautan penting.', ['mediaSosial', 'tautanPenting']],
  ],
};

export function createEditorSections({ form, collection, slug, fields, view }) {
  if (collection !== 'pengaturan' || !sections[slug]) return null;
  const controls = new Map([...form.children].map(node => [node.dataset.fieldName, node]));
  const groups = sections[slug].map(([key, label, description, names]) => ({ key, label, description,
    fields: fields.filter(field => names.includes(field.name) && controls.has(field.name)),
  })).filter(group => group.fields.length);
  const assigned = new Set(groups.flatMap(group => group.fields.map(field => field.name)));
  const remaining = fields.filter(field => controls.has(field.name) && !assigned.has(field.name));
  if (remaining.length) groups.push({ key: 'lainnya', label: 'Lainnya', description: 'Isian tambahan halaman ini.', fields: remaining });
  if (groups.length < 2) return null;
  const nav = document.createElement('div');
  nav.className = 'cms-section-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', `Bagian ${slug === 'profil' ? 'Profil' : 'Identitas Situs'}`);
  form.prepend(nav);
  const items = groups.map(group => {
    const tab = document.createElement('button');
    tab.type = 'button'; tab.id = `cms-tab-${slug}-${group.key}`;
    tab.textContent = group.label; tab.setAttribute('role', 'tab');
    const panel = document.createElement('section');
    panel.className = 'cms-section-panel'; panel.id = `cms-section-${slug}-${group.key}`;
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0; tab.setAttribute('aria-controls', panel.id);
    const heading = document.createElement('h2'); heading.textContent = group.label;
    const description = document.createElement('p'); description.className = 'cms-section-description'; description.textContent = group.description;
    panel.append(heading, description, ...group.fields.map(field => controls.get(field.name)));
    nav.append(tab); form.append(panel);
    return { ...group, tab, panel };
  });
  function activate(item, focus = false) {
    view.section = item.key;
    form.classList.toggle('is-organization-view', item.key === 'pemerintahan');
    for (const entry of items) {
      const active = entry === item;
      entry.tab.setAttribute('aria-selected', String(active));
      entry.tab.tabIndex = active ? 0 : -1; entry.panel.hidden = !active;
    }
    if (focus) item.tab.focus({ preventScroll: true });
  }
  items.forEach((item, index) => {
    item.tab.addEventListener('click', () => activate(item));
    item.tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % items.length;
      else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else return;
      event.preventDefault(); activate(items[next], true);
    });
  });
  // Daftar/opsi yang membangun ulang editor tetap membuka bagian yang dipilih.
  activate(items.find(item => item.key === view.section) || items[0]);
  return {
    revealError(text) {
      const item = items.find(item => item.fields.some(field => {
        const label = field.label || field.name;
        return text.includes(`${label} perlu diisi.`) || text.includes(`${label}:`)
          || text.includes(`${label} berada di luar`) || text.includes(`${label} —`)
          || new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\d+ —').test(text);
      }));
      if (item) activate(item);
    },
  };
}
