import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getKaryaPesertaRingkasByKategori } from "@/lib/data-contoh";

export default function PanitiaPemenangKomikPage() {
  return (
    <PemenangKategori
      kategori="komik"
      items={getKaryaPesertaRingkasByKategori("komik")}
    />
  );
}
