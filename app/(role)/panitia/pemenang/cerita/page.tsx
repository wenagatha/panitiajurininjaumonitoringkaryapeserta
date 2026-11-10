import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getKaryaPesertaRingkasByKategori } from "@/lib/data-contoh";

export default function PanitiaPemenangCeritaPage() {
  return (
    <PemenangKategori
      kategori="cerita"
      items={getKaryaPesertaRingkasByKategori("cerita")}
    />
  );
}
