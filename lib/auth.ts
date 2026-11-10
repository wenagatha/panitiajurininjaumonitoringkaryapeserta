import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "panitia" | "juri";

export type StaffProfile = {
  id: string;
  email: string;
  nama: string;
  role: StaffRole;
  kategori: "cerita" | "komik" | null;
  must_change_password: boolean;
};

export async function getStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims.sub) {
    return null;
  }
  if (typeof data.claims.email !== "string") {
    throw new Error("Email akun tidak tersedia pada sesi Supabase.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nama, role, kategori, must_change_password")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (error) {
    throw new Error(`Profil akun gagal dibaca: ${error.message}`);
  }

  if (
    !profile ||
    typeof profile.nama !== "string" ||
    typeof profile.must_change_password !== "boolean" ||
    (profile.role !== "panitia" && profile.role !== "juri") ||
    (profile.role === "juri" &&
      profile.kategori !== "cerita" &&
      profile.kategori !== "komik") ||
    (profile.role === "panitia" && profile.kategori !== null)
  ) {
    return null;
  }

  return {
    id: profile.id,
    email: data.claims.email.toLowerCase(),
    nama: profile.nama,
    role: profile.role,
    kategori: profile.kategori,
    must_change_password: profile.must_change_password,
  } as StaffProfile;
}

export async function requireStaffRole(role: StaffRole): Promise<StaffProfile> {
  const profile = await getStaffProfile();

  if (!profile) {
    redirect("/login?status=pending");
  }

  if (profile.must_change_password) {
    redirect("/setup-account");
  }

  if (profile.role !== role) {
    redirect(profile.role === "panitia" ? "/panitia" : "/juri/karya");
  }

  return profile;
}
