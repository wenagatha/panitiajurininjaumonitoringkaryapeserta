import KaryaCategoryList from "@/components/dashboard/KaryaCategoryList";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function JuriKaryaPage() {
  const juriAktif = await getJuriAktif();
  const { items, workflow, statusHistoryByKarya } = await getJuriWorkflowData(
    juriAktif.kategori,
    "juri",
    true,
  );

  return (
    <KaryaCategoryList
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
      historyByKarya={statusHistoryByKarya}
      workflow={workflow}
    />
  );
}
