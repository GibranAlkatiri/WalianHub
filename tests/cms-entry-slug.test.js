import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { uniqueSlug } from '../public/admin/content-slug.js';
import { target } from '../functions/api/cms.js';

const config = load(readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8'));

test('ID foto yang belum menjadi draf dan ID file tunggal tetap saat judul berubah atau kosong', () => {
  const slug = uniqueSlug('Taman Walian');
  expect(uniqueSlug('Taman Baru', slug)).toBe(slug);
  expect(uniqueSlug('', slug)).toBe(slug);
  for (const fixed of ['situs', 'beranda', 'profil', 'pengumuman']) {
    expect(uniqueSlug('', fixed)).toBe(fixed);
  }
});

test('konten baru memilih ID bebas; judul bisa diperbaiki selama ID belum terikat foto atau draf', () => {
  const entries = ['taman-walian', 'taman-walian-2', 'taman-walian-3'].map((slug) => ({ slug }));
  expect(uniqueSlug('Taman Walian', '', entries)).toBe('taman-walian-4');
  expect(uniqueSlug('Taman Baru', '', entries)).toBe('taman-baru');
  expect(uniqueSlug('  Café Walian!  ')).toBe('cafe-walian');
  expect(uniqueSlug('---')).toBe('');
});

test('akhiran ID ganda tetap memenuhi batas API ketika nomor bertambah dan pemotongan mengenai tanda hubung', () => {
  for (const title of ['a'.repeat(100), 'a'.repeat(97) + '-bc', 'a'.repeat(99)]) {
    const entries = [{ slug: uniqueSlug(title) }];
    for (let index = 2; index <= 12; index++) {
      const slug = uniqueSlug(title, '', entries);
      expect(slug.length).toBeLessThanOrEqual(100);
      expect(slug).toEndWith(`-${index}`);
      expect(entries.some((item) => item.slug === slug)).toBe(false);
      expect(target(config, 'destinasi', slug).slug).toBe(slug);
      entries.push({ slug });
    }
  }
});
