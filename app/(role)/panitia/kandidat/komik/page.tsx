import KandidatKategori from "@/components/kandidat/KandidatKategori";
import { getKaryaPesertaRingkasByKategori } from "@/lib/data-contoh";

export default function PanitiaKandidatKomikPage() {
  // TODO: sambungkan ke Supabase.
  const items = getKaryaPesertaRingkasByKategori("komik").map((row) => ({
    karya: { id: row.karya.id, status: row.karya.status },
    peserta: { id: row.id, nama: row.nama, asal: row.asal },
  }));
  return (
    <KandidatKategori
      kategori="komik"
      items={items}
    />
  );
}
