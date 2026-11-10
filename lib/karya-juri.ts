import "server-only";

import { getBerkasDemo } from "@/lib/berkas-demo";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";
import type { KaryaDaftarItem } from "@/components/dashboard/KaryaCategoryList";
import type { KategoriLomba } from "@/types/karya";

export function getKaryaJuriByKategori(
  kategori: KategoriLomba,
): KaryaDaftarItem[] {
  // TODO: kompromi prototipe; status dan akses kategori nantinya dijaga oleh RLS Supabase.
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );

  return karyaContoh.flatMap((karya) => {
    const peserta = pesertaById.get(karya.pesertaId);
    if (!peserta || peserta.kategori !== kategori) {
      return [];
    }

    return [
      {
        karya: {
          id: karya.id,
          pesertaId: karya.pesertaId,
          status: karya.status,
          urlKarya: karya.urlKarya,
          urlPernyataan: "",
        },
        peserta: {
          id: peserta.id,
          nama: peserta.nama,
          asal: peserta.asal,
          kategori: peserta.kategori,
          tanggalDaftar: peserta.tanggalDaftar,
        },
        berkas: getBerkasDemo(
          {
            nama: peserta.nama,
            kategori: peserta.kategori,
            urlKartu: peserta.urlKartu,
          },
          {
            urlKarya: karya.urlKarya,
            urlPernyataan: "",
          },
        ).filter((berkas) => berkas.jenis === "karya"),
      },
    ];
  });
}
