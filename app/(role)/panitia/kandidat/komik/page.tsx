import KandidatKategori from "@/components/kandidat/KandidatKategori";
import { getKandidatByKategori } from "@/lib/data-contoh";

export default function PanitiaKandidatKomikPage() {
  // TODO: sambungkan ke Supabase.
  return (
    <KandidatKategori
      kategori="komik"
      items={getKandidatByKategori("komik")}
    />
  );
}
