import KaryaCategoryList from "@/components/dashboard/KaryaCategoryList";
import { getPanitiaKaryaByKategori } from "@/lib/panitia-karya";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function PanitiaKaryaKomikPage() {
  const [{ items, historyByKarya }, { workflow }] = await Promise.all([
    getPanitiaKaryaByKategori("komik"),
    getJuriWorkflowData("komik", "panitia"),
  ]);

  return (
    <KaryaCategoryList
      kategori="komik"
      items={items}
      role="panitia"
      historyByKarya={historyByKarya}
      workflow={workflow}
    />
  );
}
