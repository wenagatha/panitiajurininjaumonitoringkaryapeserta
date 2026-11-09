import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function TinjauKaryaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karya = karyaContoh.find((item) => item.id === id);
  const peserta = karya
    ? pesertaContoh.find((item) => item.id === karya.pesertaId)
    : undefined;

  if (!karya || !peserta) {
    notFound();
  }

  return (
    <TinjauKarya
      item={{
        karya,
        peserta: {
          id: peserta.id,
          nama: peserta.nama,
          asal: peserta.asal,
          kategori: peserta.kategori,
          tanggalDaftar: peserta.tanggalDaftar,
        },
        berkas: getBerkasDemo(peserta, karya),
      }}
      role="panitia"
    />
  );
}
