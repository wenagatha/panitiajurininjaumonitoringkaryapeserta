import KaryaCategoryList, {
  type KaryaDaftarItem,
} from "@/components/dashboard/KaryaCategoryList";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default function PanitiaKaryaKomikPage() {
  const participantsById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  const items: KaryaDaftarItem[] = karyaContoh
    .flatMap((karya) => {
      const peserta = participantsById.get(karya.pesertaId);
      return peserta?.kategori === "komik"
        ? [
            {
              karya,
              peserta: {
                id: peserta.id,
                nama: peserta.nama,
                asal: peserta.asal,
                kategori: peserta.kategori,
                tanggalDaftar: peserta.tanggalDaftar,
              },
              berkas: getBerkasDemo(peserta, karya),
            },
          ]
        : [];
    });

  return (
    <KaryaCategoryList kategori="komik" items={items} role="panitia" />
  );
}
