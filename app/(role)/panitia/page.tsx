import DashboardContent from "@/components/dashboard/DashboardContent";
import { getPanitiaDashboardRows } from "@/lib/panitia-peserta";

export default async function PanitiaDashboardPage() {
  const rows = await getPanitiaDashboardRows();

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
      <DashboardContent rows={rows} />
    </main>
  );
}