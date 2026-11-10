"use server";

import { getStaffProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { StatusKarya } from "@/types/karya";

export type PanitiaRiwayatStatus = {
  id: string;
  status_lama: StatusKarya;
  status_baru: StatusKarya;
  waktu: string;
  panitia: { nama: string };
};

function isStatus(value: unknown): value is StatusKarya {
  return (
    typeof value === "string" &&
    ["menunggu", "diproses", "diverifikasi", "ditolak"].includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function updatePanitiaKaryaStatus(
  karyaId: string,
  status: StatusKarya,
): Promise<{ history: PanitiaRiwayatStatus | null }> {
  const profile = await getStaffProfile();
  if (!profile || profile.role !== "panitia" || profile.must_change_password) {
    throw new Error("Sesi panitia tidak valid. Silakan masuk kembali.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("panitia_update_karya_status", {
      p_karya_id: karyaId,
      p_status: status,
    })
    .single();

  if (error) {
    throw new Error(`Status karya gagal disimpan: ${error.message}`);
  }

  if (!isRecord(data)) {
    throw new Error("Respons penyimpanan status dari Supabase tidak valid.");
  }
  if (data.history_id === null) {
    return { history: null };
  }
  if (
    typeof data.history_id !== "string" ||
    !isStatus(data.status_lama) ||
    !isStatus(data.status_baru) ||
    typeof data.waktu !== "string"
  ) {
    throw new Error("Respons riwayat status dari Supabase tidak valid.");
  }

  return {
    history: {
      id: data.history_id,
      status_lama: data.status_lama,
      status_baru: data.status_baru,
      waktu: data.waktu,
      panitia: { nama: profile.nama },
    },
  };
}
