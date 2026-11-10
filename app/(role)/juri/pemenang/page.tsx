import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getKaryaJuriByKategori } from "@/lib/karya-juri";

export default async function JuriPemenangPage() {
  const juriAktif = await getJuriAktif();
  // TODO: kompromi prototipe; penyaringan status dan akses nantinya dijaga oleh RLS Supabase.
  const items = getKaryaJuriByKategori(juriAktif.kategori).map(
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
    />
  );
}