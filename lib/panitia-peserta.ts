import "server-only";

import { requireStaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KategoriLomba, StatusKarya } from "@/types/karya";
import type { PesertaKategoriRow } from "@/types/peserta-dashboard";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is StatusKarya {
  return (
    typeof value === "string" &&
    ["menunggu", "diproses", "diverifikasi", "ditolak"].includes(value)
  );
}

function parseParticipant(value: unknown): PesertaKategoriRow {
  if (!isRecord(value) || !isRecord(value.karya)) {
    throw new Error("Data peserta Supabase tidak lengkap atau belum memiliki karya.");
  }
  const work = value.karya;
  if (
    typeof value.id !== "string" ||
    typeof value.nama !== "string" ||
    typeof value.asal !== "string" ||
    typeof value.email !== "string" ||
    typeof value.whatsapp !== "string" ||
    (value.kategori !== "cerita" && value.kategori !== "komik") ||
    typeof value.tanggal_daftar !== "string" ||
    (value.url_kartu !== null && typeof value.url_kartu !== "string") ||
    typeof work.id !== "string" ||
    !isStatus(work.status) ||
    (work.url_karya !== null && typeof work.url_karya !== "string") ||
    (work.url_pernyataan !== null &&
      typeof work.url_pernyataan !== "string")
  ) {
    throw new Error("Format data peserta Supabase tidak valid.");
  }

  return {
    id: value.id,
    nama: value.nama,
    asal: value.asal,
    email: value.email,
    whatsapp: value.whatsapp,
    kategori: value.kategori,
    tanggalDaftar: value.tanggal_daftar,
    urlKartu: value.url_kartu,
    karya: {
      id: work.id,
      status: work.status,
      urlKarya: work.url_karya,
      urlPernyataan: work.url_pernyataan,
    },
  };
}

export async function getPanitiaPesertaByKategori(
  kategori: KategoriLomba,
): Promise<PesertaKategoriRow[]> {
  await requireStaffRole("panitia");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("peserta")
    .select(
      "id,nama,asal,email,whatsapp,kategori,tanggal_daftar,url_kartu,karya!inner(id,status,url_karya,url_pernyataan)",
    )
    .eq("kategori", kategori)
    .order("tanggal_daftar", { ascending: false });

  if (error) {
    throw new Error(`Daftar peserta gagal dimuat: ${error.message}`);
  }

  return (data ?? []).map(parseParticipant);
}

export async function getPanitiaDashboardRows() {
  await requireStaffRole("panitia");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("peserta")
    .select(
      "id,nama,asal,email,whatsapp,kategori,tanggal_daftar,url_kartu,karya!inner(id,status,url_karya,url_pernyataan)",
    )
    .order("tanggal_daftar", { ascending: false });

  if (error) {
    throw new Error(`Data dashboard gagal dimuat: ${error.message}`);
  }

  return (data ?? []).map((value) => {
    const row = parseParticipant(value);
    return {
      id: row.id,
      nama: row.nama,
      asal: row.asal,
      kategori: row.kategori,
      tanggalDaftar: row.tanggalDaftar,
      karya: {
        id: row.karya.id,
        pesertaId: row.id,
        status: row.karya.status,
      },
    };
  });
}
