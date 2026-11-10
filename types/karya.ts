export type KategoriLomba = "cerita" | "komik";

export type StatusKarya = "menunggu" | "diproses" | "diverifikasi" | "ditolak";

export type Peserta = {
  id: string;
  nama: string;
  asal: string;
  email: string;
  whatsapp: string;
  kategori: KategoriLomba;
  tanggalDaftar: string;
  // TODO: nantinya berisi tautan Google Drive dari Google Form.
  urlKartu: string;
};

export type Karya = {
  id: string;
  pesertaId: Peserta["id"];
  status: StatusKarya;
  tahap: "biasa" | "kandidat";
  dipilihOleh: string[];
  ditandaiPada: string;
  peringkat: number | null;
  ditetapkanOleh: string | null;
  ditetapkanPada: string | null;
  // TODO: nantinya berisi tautan Google Drive dari Google Form.
  urlKarya: string;
  // TODO: nantinya berisi tautan Google Drive dari Google Form.
  urlPernyataan: string;
};

export type PesertaDashboard = Peserta & {
  karya: Karya;
};

export type PesertaRingkas = Pick<
  Peserta,
  "id" | "nama" | "asal" | "kategori" | "tanggalDaftar"
>;

export type KaryaRingkas = Pick<Karya, "id" | "pesertaId" | "status">;

export type PesertaDashboardRingkas = PesertaRingkas & {
  karya: KaryaRingkas;
};
