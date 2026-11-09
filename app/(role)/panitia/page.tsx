import DashboardContent from "@/components/dashboard/DashboardContent";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";

export default function PanitiaDashboardPage() {
  const pesertaRingkas = pesertaContoh.map(
    ({ id, nama, asal, kategori, tanggalDaftar }) => ({
      id,
      nama,
      asal,
      kategori,
      tanggalDaftar,
    }),
  );
  const karyaRingkas = karyaContoh.map(({ id, pesertaId, status }) => ({
    id,
    pesertaId,
    status,
  }));

  return (
    <main>
      <header className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-[#24453b]">
          Dashboard
        </h1>
        <p className="mt-1 text-xs text-[#84918b]">
          Pantau pendaftaran dan karya yang masuk.
        </p>
      </header>
      <DashboardContent peserta={pesertaRingkas} karya={karyaRingkas} />
    </main>
  );
}