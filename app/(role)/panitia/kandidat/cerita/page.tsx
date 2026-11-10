import KandidatKategori from "@/components/kandidat/KandidatKategori";
import { getKandidatByKategori } from "@/lib/data-contoh";

export default function PanitiaKandidatCeritaPage() {
  // TODO: sambungkan ke Supabase.
  return (
    <KandidatKategori
      kategori="cerita"
      items={getKandidatByKategori("cerita")}
    />
  );
}
