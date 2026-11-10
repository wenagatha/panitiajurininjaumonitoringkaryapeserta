import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getBerkasDemo } from "@/lib/berkas-demo";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default async function TinjauKaryaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dari?: string; kategori?: string }>;
}) {
  const { id } = await params;
  const { dari, kategori } = await searchParams;
  const karya = karyaContoh.find((item) => item.id === id);
  const peserta = karya
    ? pesertaContoh.find((item) => item.id === karya.pesertaId)
    : undefined;
  const isCandidateReadOnly =
    dari === "kandidat" &&
    kategori === peserta?.kategori &&
    karya?.tahap === "kandidat" &&
    karya.status === "diverifikasi";
  const isWinnerReadOnly = dari === "pemenang";
  const readOnly = isCandidateReadOnly || isWinnerReadOnly;

  if (!karya || !peserta) {
    notFound();
  }

  const berkas = getBerkasDemo(peserta, karya);

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
        berkas: readOnly
          ? berkas.filter((file) => file.jenis === "karya")
          : berkas,
      }}
      role="panitia"
      readOnly={readOnly}
      readOnlySource={dari === "pemenang" ? "pemenang" : "kandidat"}
    />
  );
}
