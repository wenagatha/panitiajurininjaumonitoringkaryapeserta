import KaryaCategoryList from "@/components/dashboard/KaryaCategoryList";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getKaryaJuriByKategori } from "@/lib/karya-juri";

export default async function JuriKaryaPage() {
  const juriAktif = await getJuriAktif();

  return (
    <KaryaCategoryList
      kategori={juriAktif.kategori}
      items={getKaryaJuriByKategori(juriAktif.kategori)}
      role="juri"
    />
  );
}
