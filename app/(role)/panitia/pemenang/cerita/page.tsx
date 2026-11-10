import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function PanitiaPemenangCeritaPage() {
  const { items: works, workflow } = await getJuriWorkflowData(
    "cerita",
    "panitia",
  );
  const items = works.map(({ karya, peserta }) => ({
    karya: { id: karya.id, status: karya.status },
    id: peserta.id,
    nama: peserta.nama,
    asal: peserta.asal,
    kategori: peserta.kategori,
  }));

  return (
    <PemenangKategori
      kategori="cerita"
      items={items}
      workflow={workflow}
    />
  );
}
