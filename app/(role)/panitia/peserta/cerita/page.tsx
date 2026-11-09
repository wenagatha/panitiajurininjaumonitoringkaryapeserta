import TabelPesertaKategori from "@/components/dashboard/TabelPesertaKategori";
import { getPesertaDashboardByKategori } from "@/lib/data-contoh";

export default function PanitiaPesertaPage() {
  return (
    <main>
      <header className="mb-5">
        <p className="text-xs font-medium text-[#84918b]">
          Monitoring &amp; Meninjau
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#24453b]">
          Daftar Peserta Cerita HAM
        </h1>
        <p className="mt-1 text-xs text-[#84918b]">
          Lihat peserta yang terdaftar pada lomba Cerita HAM.
        </p>
      </header>
      <TabelPesertaKategori rows={getPesertaDashboardByKategori("cerita")} />
    </main>
  );
}