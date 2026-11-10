import { notFound } from "next/navigation";
import TinjauKarya from "@/components/dashboard/TinjauKarya";
import { getPanitiaKaryaById } from "@/lib/panitia-karya";
import { getJuriWorkflowData } from "@/lib/juri-workflow";

export default async function TinjauKaryaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dari?: string; kategori?: string }>;
}) {
  const { id } = await params;
  const { dari, kategori } = await searchParams;
  const data = await getPanitiaKaryaById(id);
  if (!data) {
    notFound();
  }

  const { item, history } = data;
  const workflow =
    item.karya.status === "diverifikasi"
      ? (
          await getJuriWorkflowData(item.peserta.kategori, "panitia")
        ).workflow
      : undefined;
  const readOnly =
    (dari === "kandidat" || dari === "pemenang") &&
    kategori === item.peserta.kategori;

  return (
    <TinjauKarya
      item={item}
      history={history}
      role="panitia"
      readOnly={readOnly}
      readOnlySource={dari === "pemenang" ? "pemenang" : "kandidat"}
      workflow={workflow}
    />
  );
}
