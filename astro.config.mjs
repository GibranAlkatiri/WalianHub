// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Alamat link pratinjau di GitHub Pages: https://gibranalkatiri.github.io/WalianHub/
// - site: alamat akun GitHub Pages.
// - base: nama repository, huruf besar-kecilnya harus sama persis ("WalianHub").
//   Saat pindah ke domain sendiri (misalnya walian.tomohon.go.id), ubah menjadi "/".
export default defineConfig({
  site: 'https://gibranalkatiri.github.io',
  base: '/WalianHub',
  vite: {
    plugins: [tailwindcss()],
  },
});
