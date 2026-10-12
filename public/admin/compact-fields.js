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
