import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getPeringkatByKategori } from "@/lib/peringkat";

export default function PanitiaPemenangCeritaPage() {
  return (
    <PemenangKategori
      kategori="cerita"
      items={getPeringkatByKategori("cerita")}
    />
  );
}
