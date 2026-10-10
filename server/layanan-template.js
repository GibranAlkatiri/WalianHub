import { micromark } from 'micromark';
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
// Replace in one pass: a marker typed in a title cannot become HTML later.
const fill = (template, values) => template.replace(/__CMS_[A-Z]+(?:_[A-Z]+)*__/g, (marker) => {
  if (!Object.hasOwn(values, marker)) throw new Error('Template layanan tidak lengkap.');
  return values[marker];
});

export function parseLayananTemplates(html) {
  const templates = Object.fromEntries([...html.matchAll(/<template id="([a-z-]+)">([\s\S]*?)<\/template>/g)].map(([, name, body]) => [name, body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')]));
  for (const name of ['cms-card', 'cms-item', 'cms-item-note', 'cms-requirements', 'cms-requirements-empty', 'cms-steps', 'cms-steps-empty', 'cms-icon-card-file-text', 'cms-icon-item-file-text']) if (!templates[name]) throw new Error('Template layanan belum tersedia.');
  return templates;
}
export function renderLayanan(entries, templates, view = 'both') {
  const icon = (name, type) => templates[`cms-icon-${type}-${name || 'file-text'}`] || templates[`cms-icon-${type}-file-text`];
  const list = (values = [], type) => values.length ? fill(templates[`cms-${type}`], {__CMS_LIST_ITEMS__: values.map((value) => `<li>${escape(value)}</li>`).join('')}) : templates[`cms-${type}-empty`];
  const values = ({ slug, data }, type) => ({
    __CMS_SLUG__: escape(slug), __CMS_TITLE__: escape(data.judul), __CMS_SUMMARY__: escape(data.ringkasan),
    __CMS_ICON__: icon(data.ikon, type), __CMS_REQUIREMENTS__: list(data.persyaratan, 'requirements'),
    __CMS_STEPS__: list(data.alur, 'steps'),
    __CMS_BODY__: type === 'item' && data.body?.trim() ? micromark(data.body, { allowDangerousHtml:false, allowDangerousProtocol:false }) : '',
  });
  const featured = entries.filter((entry) => entry.data.unggulan === true);
  return {
    cards: view === 'list' ? '' : featured.map((entry) => fill(templates['cms-card'], values(entry, 'card'))).join(''),
    items: view === 'home' ? '' : entries.map((entry) => fill(templates[entry.data.body?.trim() ? 'cms-item-note' : 'cms-item'], values(entry, 'item'))).join(''),
    total: entries.length, featured: featured.length,
    updated: entries.reduce((latest, entry) => entry.data.diperbarui > latest ? entry.data.diperbarui : latest, ''),
  };
}
