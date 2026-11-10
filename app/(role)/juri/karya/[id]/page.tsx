import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getJuriWorkDetail } from "@/lib/juri-workflow";

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
  const data = await getJuriWorkDetail(id, juriAktif.kategori);
  if (!data) {
    notFound();
  }

  return (
    <TinjauKarya
      item={data.item}
      workflow={data.workflow}
      role="juri"
      readOnly={readOnlyFromWinners}
      readOnlySource={readOnlyFromWinners ? "pemenang" : undefined}
    />
  );
}
