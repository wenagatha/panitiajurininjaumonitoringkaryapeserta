import type { Karya, Peserta } from "@/types/karya";

export type BerkasKarya = {
  label: string;
  href: string;
  jenis: "karya" | "kartu" | "pernyataan";
  isDemo: boolean;
};

export function getBerkasDemo(
  peserta: Pick<Peserta, "nama" | "kategori" | "urlKartu">,
  karya: Pick<Karya, "urlKarya" | "urlPernyataan">,
): BerkasKarya[] {
  return [
    {
      label: `Karya — ${peserta.nama}`,
      href: karya.urlKarya,
      jenis: "karya",
      isDemo: true,
    },
    {
      label: `${peserta.kategori === "cerita" ? "Kartu Mahasiswa" : "Kartu Pelajar"} — ${peserta.nama}`,
      href: peserta.urlKartu,
      jenis: "kartu",
      isDemo: true,
    },
    {
      label: `Lembar Pernyataan Keaslian — ${peserta.nama}`,
      href: karya.urlPernyataan,
      jenis: "pernyataan",
      isDemo: true,
    },
  ];
}
