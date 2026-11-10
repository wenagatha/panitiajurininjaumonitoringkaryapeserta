import { requireStaffRole } from "@/lib/auth";

export async function getJuriAktif() {
  const profile = await requireStaffRole("juri");
  if (!profile.kategori) {
    throw new Error("Profil juri belum memiliki kategori lomba.");
  }

  return {
    id: profile.id,
    nama: profile.nama,
    kategori: profile.kategori,
  };
}
