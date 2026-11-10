import KandidatKategori, {
  type KandidatKategoriItem,
} from "@/components/kandidat/KandidatKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getKaryaJuriByKategori } from "@/lib/karya-juri";

export default async function JuriKandidatPage() {
  const juriAktif = await getJuriAktif();
  // TODO: kompromi prototipe; penyaringan status dan akses nantinya dijaga oleh RLS Supabase.
  const items: KandidatKategoriItem[] = getKaryaJuriByKategori(
    juriAktif.kategori,
  ).map(({ karya, peserta }) => ({
    karya: { id: karya.id, status: karya.status },
    peserta: {
      id: peserta.id,
      nama: peserta.nama,
      asal: peserta.asal,
    },
  }));

  return (
    <KandidatKategori
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
    />
  );
}