// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Deploy ke Cloudflare Pages.
// - site: URL Cloudflare Pages (ganti setelah project dibuat, atau setelah pakai custom domain).
// - base: "/" karena Cloudflare Pages melayani dari root.
export default defineConfig({
  site: 'https://walianhub.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
});
