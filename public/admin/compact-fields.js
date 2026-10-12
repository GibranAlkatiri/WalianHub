// Kontrol tampilan CMS. Nilai tetap mengikuti kontrak daftar pada config.yml.
export function createTextListControl({ id, value, onChange, hintId }) {
  const input = document.createElement('textarea');
  input.id = id;
  input.className = 'cms-text-list';
  input.rows = 4;
  input.setAttribute('aria-describedby', `${hintId} ${id}-count`);
  input.value = value.join('\n');
  const count = document.createElement('small');
  count.id = `${id}-count`;
  count.className = 'cms-hint';
  const update = () => {
    const lines = input.value.split(/\r?\n/);
    count.textContent = `${lines.filter(line => line.trim()).length} item · urutan mengikuti baris`;
    input.style.height = 'auto';
    input.style.height = `${Math.min(320, Math.max(110, input.scrollHeight + 2))}px`;
    return lines;
  };
  input.addEventListener('input', () => onChange(update()));
  const control = document.createElement('div');
  control.append(input, count);
  // Tunggu sampai field terpasang agar pengukuran tinggi memakai lebar sebenarnya.
  requestAnimationFrame(update);
  return control;
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

export function createWeeklySchedule({ id, value, onChange, openRows }) {
  const group = node('div', 'cms-week');
  group.id = id;
  const head = node('div', 'cms-week-head');
  head.setAttribute('aria-hidden', 'true');
  for (const title of ['Hari', 'Status', 'Buka', 'Tutup', 'Istirahat']) head.append(node('span', '', title));
  group.append(head);
  const rows = value.map((day, index) => {
    const row = node('details', 'cms-week-row');
    row.dataset.errorLabel = `Jam Layanan — Jadwal Mingguan ${index + 1} —`;
    const rowKey = `jadwal-${index}`;
    row.open = openRows.has(rowKey) ? openRows.get(rowKey) : matchMedia('(min-width:701px)').matches;
    row.addEventListener('toggle', () => openRows.set(rowKey, row.open));
    const summary = node('summary');
    const description = node('span', 'cms-day-summary');
    summary.append(node('strong', '', day.hari), description);
    const body = node('div', 'cms-day-fields');
    const labeled = (label, input, className = '') => {
      const wrap = node('label', className);
      wrap.append(node('span', 'cms-day-label', label), input);
      return wrap;
    };
    const status = node('select');
    status.setAttribute('aria-label', `Status ${day.hari}`);
    for (const [key, text] of [['buka', 'Buka'], ['tutup', 'Tutup']]) {
      const option = node('option', '', text); option.value = key; status.append(option);
    }
    let lastOpen = day.buka || day.tutup ? structuredClone(day) : null;
    const times = {};
    const timeInput = (name, label, update) => {
      const input = node('input'); input.type = 'text'; input.inputMode = 'decimal';
      input.placeholder = '08.00'; input.maxLength = 5;
      input.setAttribute('aria-label', `${day.hari} ${label}`);
      input.addEventListener('input', () => { update(input.value); changed(); });
      times[name] = input;
      return input;
    };
    const buka = timeInput('buka', 'jam buka', val => { day.buka = val; });
    const tutup = timeInput('tutup', 'jam tutup', val => { day.tutup = val; });
    const rest = node('div', 'cms-day-break');
    const checkbox = node('input'); checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `Istirahat ${day.hari}`);
    const checkLabel = node('label', 'cms-checkbox'); checkLabel.append(checkbox, node('span', '', 'Istirahat'));
    const restTimes = node('div', 'cms-break-times');
    restTimes.append(labeled('Mulai', timeInput('mulai', 'istirahat mulai', val => { day.istirahat.mulai = val; })),
      labeled('Selesai', timeInput('selesai', 'istirahat selesai', val => { day.istirahat.selesai = val; })));
    rest.append(checkLabel, restTimes);
    const feedback = node('small', 'cms-hint');
    feedback.id = `${id}-${index}-hint`;
    feedback.hidden = true;
    for (const input of Object.values(times)) input.setAttribute('aria-describedby', feedback.id);
    function refresh(resetCache = false) {
      if (resetCache) lastOpen = day.buka || day.tutup ? structuredClone(day) : null;
      const closed = day.buka == null && day.tutup == null;
      status.value = closed ? 'tutup' : 'buka';
      buka.value = day.buka ?? ''; tutup.value = day.tutup ?? '';
      buka.disabled = closed; tutup.disabled = closed; checkbox.disabled = closed;
      buka.placeholder = closed ? '—' : '08.00'; tutup.placeholder = closed ? '—' : '16.30';
      checkbox.checked = !!day.istirahat;
      restTimes.hidden = !day.istirahat;
      times.mulai.value = day.istirahat?.mulai ?? ''; times.selesai.value = day.istirahat?.selesai ?? '';
      description.textContent = closed ? 'Tutup' : `${day.buka || '…'}–${day.tutup || '…'}${day.istirahat ? ` · istirahat ${day.istirahat.mulai || '…'}–${day.istirahat.selesai || '…'}` : ''}`;
    }
    function changed() { onChange(value); refresh(); }
    status.addEventListener('change', () => {
      if (status.value === 'tutup') {
        lastOpen = structuredClone(day);
        day.buka = null; day.tutup = null; day.istirahat = null;
      } else {
        // Jam awal ditawarkan hanya setelah pengguna memilih membuka hari tutup.
        const template = lastOpen || value.find(item => item.buka && item.tutup);
        day.buka = template?.buka || '08.00'; day.tutup = template?.tutup || '16.30';
        day.istirahat = lastOpen?.istirahat ? structuredClone(lastOpen.istirahat) : null;
        feedback.textContent = 'Periksa jam buka dan tutup hari ini. Jam memakai titik, contoh 08.00.';
        feedback.hidden = false;
      }
      changed();
    });
    checkbox.addEventListener('change', () => {
      day.istirahat = checkbox.checked ? {mulai: '', selesai: ''} : null;
      changed();
    });
    body.append(labeled('Status', status), labeled('Buka', buka), labeled('Tutup', tutup), rest, feedback);
    row.append(summary, body); group.append(row); refresh();
    return {refresh, row};
  });
  const copy = node('details', 'cms-schedule-copy');
  copy.append(node('summary', '', 'Salin jadwal ke hari lain'));
  const controls = node('div', 'cms-copy-controls');
  const source = node('select'); source.setAttribute('aria-label', 'Salin jadwal dari');
  value.forEach((day, index) => { const option = node('option', '', day.hari); option.value = index; source.append(option); });
  const sourceLabel = node('label'); sourceLabel.append(node('span', '', 'Salin dari'), source);
  const destinations = node('fieldset', 'cms-copy-days'); destinations.append(node('legend', '', 'Pilih hari tujuan'));
  const targets = value.map((day, index) => {
    const label = node('label', 'cms-checkbox'); const input = node('input'); input.type = 'checkbox';
    label.append(input, document.createTextNode(day.hari)); destinations.append(label);
    return {input, index};
  });
  function excludeSource() { for (const target of targets) { target.input.disabled = target.index === Number(source.value); if (target.input.disabled) target.input.checked = false; } }
  source.addEventListener('change', excludeSource); excludeSource();
  const apply = node('button', '', 'Terapkan ke hari pilihan'); apply.type = 'button';
  const result = node('p', 'cms-hint'); result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
  apply.addEventListener('click', () => {
    const selected = targets.filter(target => target.input.checked && !target.input.disabled);
    if (!selected.length) { result.textContent = 'Pilih minimal satu hari tujuan.'; return; }
    const template = value[Number(source.value)];
    for (const target of selected) {
      const day = value[target.index];
      day.buka = template.buka; day.tutup = template.tutup;
      day.istirahat = template.istirahat ? structuredClone(template.istirahat) : null;
      rows[target.index].refresh(true); target.input.checked = false;
    }
    onChange(value);
    result.textContent = `Jadwal ${template.hari} disalin ke ${selected.map(target => value[target.index].hari).join(', ')}. Hari lain tetap sesuai jadwalnya.`;
  });
  controls.append(sourceLabel, destinations, apply, result); copy.append(controls); group.append(copy);
  return group;
}
