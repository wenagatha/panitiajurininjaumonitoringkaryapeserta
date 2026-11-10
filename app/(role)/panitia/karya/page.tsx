import KaryaCategoryList from "@/components/dashboard/KaryaCategoryList";
import { getPanitiaKaryaByKategori } from "@/lib/panitia-karya";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function PanitiaKaryaCeritaPage() {
  const [{ items, historyByKarya }, { workflow }] = await Promise.all([
    getPanitiaKaryaByKategori("cerita"),
    getJuriWorkflowData("cerita", "panitia"),
  ]);

  return (
    <KaryaCategoryList
      kategori="cerita"
      items={items}
      role="panitia"
      historyByKarya={historyByKarya}
      workflow={workflow}
    />
  );
}
