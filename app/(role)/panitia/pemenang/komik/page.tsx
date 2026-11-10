import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getPeringkatByKategori } from "@/lib/peringkat";

export default function PanitiaPemenangKomikPage() {
  return (
    <PemenangKategori
      kategori="komik"
      items={getPeringkatByKategori("komik")}
    />
  );
}
