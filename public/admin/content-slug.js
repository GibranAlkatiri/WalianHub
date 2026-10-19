// Slugs are shared by content and uploaded photos. Once assigned, keep them
// even when the editor changes the title before saving the first draft.
export function uniqueSlug(text, existingSlug = '', entries = []) {
  if (existingSlug) return existingSlug;
  const base = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');
  if (!base) return '';
  const taken = new Set(entries.map((item) => item.slug));
  let candidate = base;
  let counter = 2;
  while (taken.has(candidate)) {
    const suffix = `-${counter++}`;
    candidate = base.slice(0, 100 - suffix.length).replace(/-$/, '') + suffix;
  }
  return candidate;
}
