import { ATURAN_LOMBA } from "@/lib/aturan-lomba";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";
import type { Karya, KategoriLomba, Peserta } from "@/types/karya";

export type KaryaBerperingkat = {
  karya: Pick<
    Karya,
    "id" | "status" | "tahap" | "peringkat" | "ditetapkanOleh" | "ditetapkanPada"
  >;
  peserta: Pick<Peserta, "id" | "nama" | "asal" | "kategori">;
};

// TODO: sambungkan ke Supabase.
// TODO: peringkat hanya untuk karya kandidat; nantinya juga dijaga oleh RLS dan aturan unik di database Supabase.
export function getPeringkatByKategori(
  kategori: KategoriLomba,
): KaryaBerperingkat[] {
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  const peringkatTerpakai = new Set<number>();
  const hasil: KaryaBerperingkat[] = [];

  for (const karya of karyaContoh) {
    if (karya.peringkat === null) {
      continue;
    }

    const peserta = pesertaById.get(karya.pesertaId);
    if (!peserta || peserta.kategori !== kategori) {
      continue;
    }

    if (process.env.NODE_ENV === "development") {
      if (karya.tahap !== "kandidat" || karya.status !== "diverifikasi") {
        throw new Error(
          `Karya ${karya.id} memiliki peringkat tetapi bukan kandidat terverifikasi.`,
        );
      }
      if (peringkatTerpakai.has(karya.peringkat)) {
        throw new Error(
          `Peringkat ${karya.peringkat} digunakan lebih dari satu karya pada kategori ${kategori}.`,
        );
      }
    }
    peringkatTerpakai.add(karya.peringkat);

    const { id, nama, asal, kategori: kategoriPeserta } = peserta;
    const {
      id: karyaId,
      status,
      tahap,
      peringkat,
      ditetapkanOleh,
      ditetapkanPada,
    } = karya;
    hasil.push({
      karya: {
        id: karyaId,
        status,
        tahap,
        peringkat,
        ditetapkanOleh,
        ditetapkanPada,
      },
      peserta: { id, nama, asal, kategori: kategoriPeserta },
    });
  }

  return hasil
    .sort(
      (first, second) =>
        (first.karya.peringkat ?? 0) - (second.karya.peringkat ?? 0),
    )
    .filter(
      ({ karya }) =>
        karya.peringkat !== null &&
        karya.peringkat <= ATURAN_LOMBA[kategori].jumlahPeringkat,
    );
}
