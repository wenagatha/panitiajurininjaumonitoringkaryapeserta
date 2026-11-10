import type { Karya, KategoriLomba, Peserta, StatusKarya } from "@/types/karya";

export type PesertaKategoriRow = Pick<
  Peserta,
  "id" | "nama" | "asal" | "email" | "whatsapp" | "tanggalDaftar"
> & {
  kategori: KategoriLomba;
  urlKartu: string | null;
  karya: Pick<Karya, "id"> & {
    status: StatusKarya;
    urlKarya: string | null;
    urlPernyataan: string | null;
  };
};
