import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function JuriPemenangPage() {
  const juriAktif = await getJuriAktif();
  const { items: works, workflow } = await getJuriWorkflowData(
    juriAktif.kategori,
    "juri",
  );
  const items = works.map(
    ({ karya, peserta }) => ({
      karya: { id: karya.id, status: karya.status },
      id: peserta.id,
      nama: peserta.nama,
      asal: peserta.asal,
      kategori: peserta.kategori,
    }),
  );

  return (
    <PemenangKategori
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
      workflow={workflow}
    />
  );
}