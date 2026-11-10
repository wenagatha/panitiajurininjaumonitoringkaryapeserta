import type { KategoriLomba } from "@/types/karya";

// jumlahPeringkat = banyak peringkat yang ditetapkan juri di halaman Pemenang (Cerita 10 besar, Komik 3 besar); belum dipakai di halaman Kandidat.
// TODO: nantinya dibaca dari tabel pengaturan di Supabase.
export const ATURAN_LOMBA: Record<
  KategoriLomba,
  {
    batasKandidat: number;
    jumlahJuara: number;
    jumlahPeringkat: number;
  }
> = {
  cerita: { batasKandidat: 13, jumlahJuara: 3, jumlahPeringkat: 10 },
  komik: { batasKandidat: 10, jumlahJuara: 3, jumlahPeringkat: 3 },
};

// TODO: nantinya dari tabel pengaturan.
export const BATAS_AKTIF_MENIT = 5;
// TODO: nantinya dari tabel pengaturan.
export const HEARTBEAT_DETIK = 60;
