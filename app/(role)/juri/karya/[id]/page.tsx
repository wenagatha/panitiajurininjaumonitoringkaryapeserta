import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getJuriAktif } from "@/lib/juri-aktif";
import { getKaryaJuriByKategori } from "@/lib/karya-juri";

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
  const item = getKaryaJuriByKategori(juriAktif.kategori).find(
    (entry) => entry.karya.id === id,
  );
  if (!item) {
    notFound();
  }

  return (
    <TinjauKarya
      item={item}
      role="juri"
      readOnly={readOnlyFromWinners}
      readOnlySource={readOnlyFromWinners ? "pemenang" : undefined}
    />
  );
}
