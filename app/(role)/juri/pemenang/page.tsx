import PemenangKategori from "@/components/pemenang/PemenangKategori";
import { getJuriAktif } from "@/lib/juri-aktif";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function JuriPemenangPage() {
  const juriAktif = await getJuriAktif();
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  const items = karyaContoh.flatMap((karya) => {
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
        karya: { id: karya.id, status: karya.status },
        id: peserta.id,
        nama: peserta.nama,
        asal: peserta.asal,
        kategori: peserta.kategori,
      },
    ];
  });

  return (
    <PemenangKategori
      kategori={juriAktif.kategori}
      items={items}
      role="juri"
    />
  );
}