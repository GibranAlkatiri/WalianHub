// Editor tampilan: mengubah isian Profil di memori, tanpa API atau penyimpanan.
const ROOT = 'Lurah';

export function descendants(list, title) {
  const found = new Set([title]);
  for (let changed = true; changed;) {
    changed = false;
    for (const item of list) if (found.has(item.atasan) && !found.has(item.jabatan)) { found.add(item.jabatan); changed = true; }
  }
  return found;
}

export function parentChoices(list, item = null) {
  const blocked = item ? descendants(list, item.jabatan) : new Set();
  return [ROOT, ...new Set(list.filter(other => !blocked.has(other.jabatan) && !other.garisSamping && other.jabatan !== ROOT).map(other => other.jabatan))];
}

export function changePosition(list, item, draft) {
  const title = String(draft.jabatan || '').trim();
  if (!title) throw new Error('Isi nama jabatan dahulu.');
  if (title === ROOT || list.some(other => other !== item && other.jabatan === title)) throw new Error('Nama jabatan sudah digunakan. Pilih nama yang berbeda.');
  if (!parentChoices(list, item).includes(draft.atasan)) throw new Error('Pilih atasan yang tersedia. Jabatan tidak boleh berada di bawah dirinya atau bawahannya.');
  if (draft.garisSamping && item && list.some(other => other.atasan === item.jabatan)) throw new Error('Jabatan yang memiliki bawahan harus memakai hubungan bawahan langsung.');
  const previous = item?.jabatan;
  const names = String(draft.nama || '').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  const value = {jabatan:title, nama:names, atasan:draft.atasan, garisSamping:draft.garisSamping === true};
  if (item) {
    // A rename must keep its children connected to the same position.
    const unambiguous = list.filter(other => other.jabatan === previous).length === 1;
    Object.assign(item, value);
    if (unambiguous && previous !== title) for (const child of list) if (child !== item && child.atasan === previous) child.atasan = title;
  } else { item = value; list.push(item); }
  return item;
}

export function removePosition(list, item) {
  const index = list.indexOf(item);
  if (index < 0) return;
  const children = list.filter(other => other !== item && other.atasan === item.jabatan);
  if (children.length && !parentChoices(list, item).includes(item.atasan)) throw new Error('Perbaiki atasan jabatan ini sebelum menghapusnya.');
  if (list.filter(other => other.jabatan === item.jabatan).length === 1) for (const child of children) child.atasan = item.atasan;
  list.splice(index, 1);
}

export function organizationLayout(list) {
  const width = 176, height = 104, gap = 32, nodes = [], edges = [], visited = new Set();
  function build(item) {
    if (item && visited.has(item)) return null;
    if (item) visited.add(item);
    const title = item?.jabatan || ROOT;
    const children = list.filter(child => !visited.has(child) && child.atasan === title).map(build).filter(Boolean);
    const normal = children.filter(child => !child.item.garisSamping);
    const side = children.filter(child => child.item.garisSamping);
    const childWidth = normal.reduce((sum, child) => sum + child.width, 0) + Math.max(0, normal.length - 1) * gap;
    return {item, normal, side, width:Math.max(width, childWidth, side.length ? 2 * (width * 1.5 + gap) : 0)};
  }
  const tree = build(null);
  function place(branch, left, top, side = false) {
    const x = left + (branch.width - width) / 2;
    const node = {item:branch.item, x, y:top, side}; nodes.push(node);
    branch.side.forEach((child, index) => {
      const sx = x + width + gap, sy = top + index * (height + 16);
      nodes.push({item:child.item, x:sx, y:sy, side:true});
      edges.push({side:true, path:`M ${x + width} ${top + height / 2} H ${x + width + gap / 2} V ${sy + height / 2} H ${sx}`});
      // Invalid legacy drafts with children on a coordination position remain
      // available in the repair list instead of being silently dropped.
    });
    const below = top + Math.max(height, branch.side.length * (height + 16) - 16) + 56;
    const total = branch.normal.reduce((sum, child) => sum + child.width, 0) + Math.max(0, branch.normal.length - 1) * gap;
    let cursor = left + (branch.width - total) / 2;
    for (const child of branch.normal) {
      const target = cursor + child.width / 2;
      edges.push({side:false, path:`M ${x + width / 2} ${top + height} V ${below - 28} H ${target} V ${below}`});
      place(child, cursor, below); cursor += child.width + gap;
    }
  }
  place(tree, 16, 16);
  const shown = new Set(nodes.map(node => node.item));
  return {nodes, edges, width:tree.width + 32, height:Math.max(...nodes.map(node => node.y + height)) + 16, unplaced:list.filter(item => !shown.has(item))};
}

const element = (tag, className, text) => {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text != null) node.textContent = text; return node;
};
const action = (text, callback, className = '') => {
  const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', callback); return node;
};

export function createOrganizationEditor({data, onChange}) {
  const list = Array.isArray(data.strukturOrganisasi) ? data.strukturOrganisasi : (data.strukturOrganisasi = []);
  const box = element('div', 'cms-field cms-org');
  box.append(element('h3', '', 'Struktur organisasi'), element('p', 'cms-org-help', 'Klik kotak untuk mengubah jabatan, nama pejabat, atau atasannya. Perubahan tersimpan bersama seluruh Profil.'));
  const tools = element('div', 'cms-org-tools');
  tools.append(action('+ Tambah jabatan', () => edit(null, ROOT)), element('span', 'cms-org-legend', 'Garis utuh: bawahan · Putus-putus: koordinasi'));
  const viewport = element('div', 'cms-org-viewport'); viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Bagan struktur organisasi. Geser untuk melihat semua jabatan.');
  const repair = element('div', 'cms-org-repair');
  box.append(tools, viewport, repair);
  let dialog, resize, mounted = false, destroyed = false;
  const buttons = new Map();
  function changed(item) { onChange(); render(); if (item !== undefined) buttons.get(item)?.focus({preventScroll:true}); }
  function render() {
    const layout = organizationLayout(list); buttons.clear();
    const canvas = element('div', 'cms-org-canvas');
    canvas.style.width = `${layout.width}px`; canvas.style.height = `${layout.height}px`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`); svg.setAttribute('aria-hidden', 'true');
    for (const edge of layout.edges) {
      const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', edge.path);
      if (edge.side) path.setAttribute('stroke-dasharray', '6 5'); svg.append(path);
    }
    canvas.append(svg);
    for (const node of layout.nodes) {
      const item = node.item, title = item?.jabatan || ROOT;
      const names = item ? item.nama || [] : [data.lurah?.nama || ''];
      const button = action('', () => edit(item), `cms-org-node${item ? '' : ' is-root'}${node.side ? ' is-coordination' : ''}`);
      button.dataset.position = title;
      button.setAttribute('aria-label', `Ubah ${title}${node.side ? ', hubungan koordinasi' : ''}`);
      button.append(element('strong', '', title), element('span', 'cms-org-person', names.filter(Boolean).join(', ') || 'Belum ada pejabat'), element('small', '', node.side ? 'Koordinasi · klik untuk ubah' : 'Klik untuk ubah'));
      button.style.left = `${node.x}px`; button.style.top = `${node.y}px`;
      canvas.append(button); buttons.set(item, button);
    }
    viewport.replaceChildren(canvas); repair.replaceChildren(); repair.hidden = !layout.unplaced.length;
    if (layout.unplaced.length) {
      repair.append(element('p', '', 'Jabatan berikut belum tersambung dengan benar. Klik untuk memperbaiki atasannya.'));
      for (const item of layout.unplaced) repair.append(action(item.jabatan || 'Jabatan tanpa nama', () => edit(item)));
    }
    if (!mounted) {
      resize?.disconnect();
      resize = new ResizeObserver(() => {
        if (mounted || viewport.clientWidth === 0) return;
        viewport.scrollLeft = Math.max(0, (layout.width - viewport.clientWidth) / 2);
        mounted = true; resize.disconnect();
      });
      resize.observe(viewport);
    }
  }
  function close() { dialog?.close(); }
  function edit(item, parent) {
    if (destroyed || dialog) return;
    const isRoot = item === null && parent === undefined, isNew = parent !== undefined;
    const previousFocus = document.activeElement;
    const modal = element('dialog', 'cms-dialog cms-org-dialog'); dialog = modal;
    modal.setAttribute('aria-labelledby', 'cms-org-dialog-title');
    const form = element('form', 'cms-org-form'); form.noValidate = true;
    const heading = element('div', 'cms-dialog-body');
    heading.append(element('h2', '', isRoot ? 'Lurah' : isNew ? 'Tambah bawahan' : 'Ubah jabatan'));
    heading.firstChild.id = 'cms-org-dialog-title';
    heading.append(element('p', '', 'Atur isian lalu klik Selesai. Gunakan Simpan draf atau Terbitkan untuk menyimpan seluruh Profil.'));
    const error = element('p', 'cms-message is-error'); error.hidden = true; error.setAttribute('role', 'alert');
    heading.append(error);
    function control(label, type, value, id) {
      const group = element('div', 'cms-field'), caption = element('label', '', label), input = document.createElement(type);
      input.id = id; caption.htmlFor = id; input.value = value || ''; group.append(caption, input); heading.append(group); return input;
    }
    let title, names, superior, coordination;
    if (isRoot) names = control('Nama Lurah', 'input', data.lurah?.nama, 'cms-org-chief-name');
    else {
      title = control('Nama jabatan', 'input', isNew ? '' : item.jabatan, 'cms-org-position-title');
      names = control('Nama pejabat', 'textarea', isNew ? '' : (item.nama || []).join('\n'), 'cms-org-position-names'); names.rows = 3;
      names.after(element('small', 'cms-hint', 'Satu nama per baris. Kosongkan jika jabatan belum terisi.'));
      superior = control('Di bawah siapa?', 'select', '', 'cms-org-position-parent');
      for (const choice of parentChoices(list, isNew ? null : item)) { const option = element('option', '', choice); option.value = choice; superior.append(option); }
      superior.value = isNew ? parent : item.atasan;
      const details = element('details', 'cms-org-advanced'); details.append(element('summary', '', 'Pengaturan hubungan'));
      const label = element('label', 'cms-checkbox'); coordination = document.createElement('input'); coordination.type = 'checkbox';
      coordination.checked = !isNew && item.garisSamping === true;
      label.append(coordination, document.createTextNode('Hubungan koordinasi (garis putus-putus)'));
      if (!isNew && list.some(child => child !== item && child.atasan === item.jabatan)) { coordination.disabled = true; coordination.checked = false; }
      details.append(label, element('small', 'cms-hint', 'Jabatan koordinasi berada di samping atasannya dan tidak memiliki bawahan.')); heading.append(details);
    }
    const footer = element('div', 'cms-dialog-actions');
    footer.append(action('Batal', close));
    const done = element('button', 'cms-dialog-primary', 'Selesai'); done.type = 'submit'; footer.append(done);
    form.append(heading, footer); modal.append(form);
    const children = !isRoot && !isNew ? list.filter(child => child !== item && child.atasan === item.jabatan) : [];
    function commit() {
      try {
        if (isRoot) {
          if (!names.value.trim()) throw new Error('Isi nama Lurah dahulu.');
          if (!data.lurah) data.lurah = {nama:'',foto:''}; data.lurah.nama = names.value.trim(); close(); changed(null); return null;
        }
        const updated = changePosition(list, isNew ? null : item, {jabatan:title.value,nama:names.value,atasan:superior.value,garisSamping:coordination.checked});
        close(); changed(updated); return updated;
      } catch (failure) { error.textContent = failure.message; error.hidden = false; (isRoot ? names : title).focus(); return false; }
    }
    form.addEventListener('submit', event => { event.preventDefault(); commit(); });
    if (!isNew) {
      const extra = element('div', 'cms-org-dialog-tools');
      const add = action('+ Tambah bawahan', () => {
        const updated = commit(); if (updated === false) return;
        // Closing a dialog synchronously clears its controller before opening
        // the next form; unsaved changes to the parent are applied first.
        edit(null, isRoot ? ROOT : updated.jabatan);
      });
      add.disabled = !isRoot && item.garisSamping === true;
      if (add.disabled) add.title = 'Ubah hubungan koordinasi terlebih dahulu untuk menambah bawahan.';
      extra.append(add);
      if (!isRoot) {
        extra.append(action('Pindahkan', () => { superior.focus(); superior.scrollIntoView({block:'nearest'}); }));
        extra.append(action('Hapus jabatan', () => {
          const panel = element('div', 'cms-dialog-body'); panel.append(element('h2', '', `Hapus ${item.jabatan}?`)); panel.firstChild.id = 'cms-org-dialog-title';
          panel.append(element('p', '', children.length ? `Bawahan langsung akan dipindahkan ke ${item.atasan}. Nama pejabat dan susunan di bawahnya tetap dipertahankan.` : 'Jabatan ini akan dikeluarkan dari bagan. Perubahan baru tersimpan setelah seluruh Profil disimpan.'));
          const warning = element('p', 'cms-message is-error'); warning.hidden = true; warning.setAttribute('role', 'alert'); panel.append(warning);
          const actions = element('div', 'cms-dialog-actions'); actions.append(action('Batal', () => { close(); edit(item); }));
          actions.append(action('Hapus jabatan', () => { try { removePosition(list,item); close(); changed(undefined); } catch(failure){warning.textContent=failure.message;warning.hidden=false;} }, 'cms-dialog-danger'));
          modal.replaceChildren(panel, actions); actions.firstChild.focus();
        }, 'cms-danger-text'));
      }
      heading.append(extra);
    }
    const previousOverflow = document.documentElement.style.overflow;
    const cleanupDialog = () => {
      if (!modal.isConnected) return;
      if (dialog === modal) dialog = null;
      document.documentElement.style.overflow = previousOverflow; modal.remove();
      if (previousFocus?.isConnected && !document.querySelector('dialog[open]')) previousFocus.focus({preventScroll:true});
    };
    modal.addEventListener('close', cleanupDialog, {once:true});
    // Clear the controller immediately so chained edit/add actions can open.
    const nativeClose = modal.close.bind(modal);
    modal.close = () => { if (dialog === modal) dialog = null; nativeClose(); cleanupDialog(); };
    document.body.append(modal); document.documentElement.style.overflow = 'hidden'; modal.showModal(); (isRoot ? names : title).focus();
  }
  render();
  return {element:box, destroy(){destroyed=true;resize?.disconnect();close();}};
}
