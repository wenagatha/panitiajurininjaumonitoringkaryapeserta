import KandidatKategori from "@/components/kandidat/KandidatKategori";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function PanitiaKandidatKomikPage() {
  const { items: works, workflow } = await getJuriWorkflowData(
    "komik",
    "panitia",
  );
  const items = works.map(({ karya, peserta }) => ({
    karya: { id: karya.id, status: karya.status },
    peserta: { id: peserta.id, nama: peserta.nama, asal: peserta.asal },
  }));
  return (
    <KandidatKategori
      kategori="komik"
      items={items}
      workflow={workflow}
    />
  );
}
