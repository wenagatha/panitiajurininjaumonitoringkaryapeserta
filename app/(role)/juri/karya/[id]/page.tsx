import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { getJuriAktif } from "@/lib/juri-aktif";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function JuriTinjauKaryaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dari?: string | string[] }>;
}) {
  const { id } = await params;
  const { dari } = await searchParams;
  const readOnlyFromWinners = dari === "pemenang";
  const juriAktif = await getJuriAktif();
  const karya = karyaContoh.find((item) => item.id === id);
  const peserta = karya
    ? pesertaContoh.find((item) => item.id === karya.pesertaId)
    : undefined;

  if (
    !karya ||
    !peserta ||
    peserta.kategori !== juriAktif.kategori ||
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
      readOnly={readOnlyFromWinners}
      readOnlySource={readOnlyFromWinners ? "pemenang" : undefined}
    />
  );
}
