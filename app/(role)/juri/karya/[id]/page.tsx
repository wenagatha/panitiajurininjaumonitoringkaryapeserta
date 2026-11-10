import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { JURI_AKTIF } from "@/lib/juri-contoh";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function JuriTinjauKaryaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karya = karyaContoh.find((item) => item.id === id);
  const peserta = karya
    ? pesertaContoh.find((item) => item.id === karya.pesertaId)
    : undefined;

  if (
    !karya ||
    !peserta ||
    peserta.kategori !== JURI_AKTIF.kategori ||
    karya.status !== "diverifikasi"
  ) {
    notFound();
  }

  const berkasKarya = getBerkasDemo(peserta, karya).filter(
    (berkas) => berkas.jenis === "karya",
  );

  return (
    <TinjauKarya
      item={{
        karya: { ...karya, urlPernyataan: "" },
        peserta: {
          id: peserta.id,
          nama: peserta.nama,
          asal: peserta.asal,
          kategori: peserta.kategori,
          tanggalDaftar: peserta.tanggalDaftar,
        },
        berkas: berkasKarya,
      }}
      role="juri"
    />
  );
}
