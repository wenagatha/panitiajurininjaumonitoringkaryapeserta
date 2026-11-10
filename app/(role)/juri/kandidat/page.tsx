import KandidatKategori, {
  type KandidatKategoriItem,
} from "@/components/kandidat/KandidatKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function JuriKandidatPage() {
  const juriAktif = await getJuriAktif();
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  // TODO: penyaringan kategori dan status juga dijaga oleh RLS Supabase.
  const items: KandidatKategoriItem[] = karyaContoh.flatMap((karya) => {
    const peserta = pesertaById.get(karya.pesertaId);
    if (
      !peserta ||
      peserta.kategori !== juriAktif.kategori ||
      karya.status !== "diverifikasi"
    ) {
      return [];
    }

    return [
      {
        karya: { id: karya.id, status: karya.status },
        peserta: {
          id: peserta.id,
          nama: peserta.nama,
          asal: peserta.asal,
        },
      },
    ];
  });

  return (
    <KandidatKategori
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
    />
  );
}