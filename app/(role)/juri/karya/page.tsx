import KaryaCategoryList, {
  type KaryaDaftarItem,
} from "@/components/dashboard/KaryaCategoryList";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { getJuriAktif } from "@/lib/juri-aktif";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function JuriKaryaPage() {
  const juriAktif = await getJuriAktif();
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  // TODO: nantinya juga dijaga oleh RLS Supabase.
  const items: KaryaDaftarItem[] = karyaContoh.flatMap((karya) => {
    const peserta = pesertaById.get(karya.pesertaId);
    if (
      !peserta ||
      peserta.kategori !== juriAktif.kategori ||
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
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
    />
  );
}
