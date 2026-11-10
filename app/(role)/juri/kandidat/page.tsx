import KandidatKategori, {
  type KandidatKategoriItem,
} from "@/components/kandidat/KandidatKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function JuriKandidatPage() {
  const juriAktif = await getJuriAktif();
  const { items: works, workflow } = await getJuriWorkflowData(
    juriAktif.kategori,
    "juri",
  );
  const items: KandidatKategoriItem[] = works.map(({ karya, peserta }) => ({
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
      workflow={workflow}
    />
  );
}