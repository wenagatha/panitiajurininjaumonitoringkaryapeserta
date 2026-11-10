import type { KategoriLomba } from "@/types/karya";

export type JuriContoh = {
  id: string;
  nama: string;
  kategori: KategoriLomba;
};

// TODO: nantinya dari Supabase Auth dan tabel profiles.
export const JURI_CONTOH: readonly JuriContoh[] = [
  { id: "juri-cerita-a", nama: "Juri Cerita A", kategori: "cerita" },
  { id: "juri-cerita-b", nama: "Juri Cerita B", kategori: "cerita" },
  { id: "juri-komik-a", nama: "Juri Komik A", kategori: "komik" },
  { id: "juri-komik-b", nama: "Juri Komik B", kategori: "komik" },
];

export const JURI_AKTIF = JURI_CONTOH[0];
