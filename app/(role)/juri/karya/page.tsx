import KaryaCategoryList, {
  type KaryaDaftarItem,
} from "@/components/dashboard/KaryaCategoryList";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { JURI_AKTIF } from "@/lib/juri-contoh";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default function JuriKaryaPage() {
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  // TODO: nantinya juga dijaga oleh RLS Supabase.
  const items: KaryaDaftarItem[] = karyaContoh.flatMap((karya) => {
    const peserta = pesertaById.get(karya.pesertaId);
    if (
      !peserta ||
      peserta.kategori !== JURI_AKTIF.kategori ||
      karya.status !== "diverifikasi"
    ) {
      return [];
    }

    return [
      {
        karya: { ...karya, urlPernyataan: "" },
        peserta: {
          id: peserta.id,
          nama: peserta.nama,
          asal: peserta.asal,
          kategori: peserta.kategori,
          tanggalDaftar: peserta.tanggalDaftar,
        },
        berkas: getBerkasDemo(peserta, karya).filter(
          (berkas) => berkas.jenis === "karya",
        ),
      },
    ];
  });

  return (
    <KaryaCategoryList
      kategori={JURI_AKTIF.kategori}
      items={items}
      role="juri"
    />
  );
}
