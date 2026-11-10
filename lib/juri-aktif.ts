import { cookies } from "next/headers";
import { JURI_CONTOH } from "@/lib/juri-contoh";

export async function getJuriAktif() {
  const cookieStore = await cookies();
  const id = cookieStore.get("juri_aktif")?.value;
  return JURI_CONTOH.find((juri) => juri.id === id) ?? JURI_CONTOH[0];
}
