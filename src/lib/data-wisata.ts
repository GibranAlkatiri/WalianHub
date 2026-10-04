import { getCollection } from 'astro:content';
import { susunWisata } from './wisata';

// Dihitung ulang saat build setelah konten berubah, tanpa saklar manual di CMS.
export const wisata = susunWisata(await getCollection('destinasi'));
