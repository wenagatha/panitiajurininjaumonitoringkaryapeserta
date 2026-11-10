"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffProfile } from "@/lib/auth";

export type SignInResult = {
  error?: string;
};

export async function signInAction(
  email: string,
  password: string,
): Promise<SignInResult> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { error: "Email atau kata sandi salah." };
  }

  const profile = await getStaffProfile();
  if (!profile) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw new Error(`Sesi akun belum aktif tidak dapat diakhiri: ${signOutError.message}`);
    }
    return {
      error:
        "Akun belum mendapat akses panitia atau juri. Hubungi pengelola untuk mengatur peran akun.",
    };
  }

  if (profile.must_change_password) {
    redirect("/setup-account");
  }

  redirect(profile.role === "panitia" ? "/panitia" : "/juri/karya");
}

export type CompleteAccountSetupResult = {
  error?: string;
};

export async function completeAccountSetupAction(
  nama: string,
  password: string,
): Promise<CompleteAccountSetupResult> {
  const normalizedName = nama.trim();
  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return { error: "Nama harus terdiri dari 2 sampai 100 karakter." };
  }
  if (password.length < 8) {
    return { error: "Kata sandi baru minimal 8 karakter." };
  }

  const profile = await getStaffProfile();
  if (!profile) {
    return { error: "Akun ini belum memiliki akses panitia atau juri." };
  }
  if (!profile.must_change_password) {
    redirect(profile.role === "panitia" ? "/panitia" : "/juri/karya");
  }

  const supabase = await createClient();
  const { error: passwordError } = await supabase.auth.updateUser({
    password,
  });
  if (passwordError) {
    return {
      error: "Kata sandi baru gagal disimpan. Periksa persyaratan lalu coba lagi.",
    };
  }

  const { error: profileError } = await supabase.rpc(
    "complete_staff_onboarding",
    { p_nama: normalizedName },
  );
  if (profileError) {
    return {
      error:
        "Kata sandi sudah diperbarui, tetapi nama belum tersimpan. Kirim lagi formulir dengan kata sandi baru yang sama.",
    };
  }

  redirect(profile.role === "panitia" ? "/panitia" : "/juri/karya");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Gagal keluar dari akun: ${error.message}`);
  }
  redirect("/login");
}
