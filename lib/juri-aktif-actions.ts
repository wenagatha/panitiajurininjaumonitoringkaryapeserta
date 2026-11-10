"use server";

import { cookies } from "next/headers";
import { JURI_CONTOH } from "@/lib/juri-contoh";

export async function ubahJuriAktif(id: string): Promise<void> {
  const juri = JURI_CONTOH.find((candidate) => candidate.id === id);
  if (!juri) {
    throw new Error("Juri yang dipilih tidak valid.");
  }

  const cookieStore = await cookies();
  cookieStore.set("juri_aktif", juri.id, {
    path: "/",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
}
