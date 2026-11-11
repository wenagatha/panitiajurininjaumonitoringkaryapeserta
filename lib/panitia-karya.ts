import "server-only";

import { requireStaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KaryaDaftarItem } from "@/components/dashboard/KaryaCategoryList";
import type { PanitiaRiwayatStatus } from "@/lib/panitia-actions";
import type { KategoriLomba, StatusKarya } from "@/types/karya";
import type { BerkasKarya } from "@/lib/berkas-demo";

type PesertaRow = {
  id: string;
  nama: string;
  asal: string;
  kategori: KategoriLomba;
  tanggal_daftar: string;
  url_kartu: string | null;
};

type KaryaRow = {
  id: string;
  peserta_id: string;
  status: StatusKarya;
  alasan_penolakan: string | null;
  url_karya: string | null;
  url_pernyataan: string | null;
  peserta: PesertaRow;
};

type RiwayatRow = {
  id: string;
  karya_id: string;
  status_lama: StatusKarya;
  status_baru: StatusKarya;
  alasan_penolakan: string | null;
  waktu: string;
  panitia: { nama: string };
};

function isStatus(value: string): value is StatusKarya {
  return ["menunggu", "diproses", "diverifikasi", "ditolak"].includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseKaryaRow(value: unknown): KaryaRow {
  if (!isRecord(value) || !isRecord(value.peserta)) {
    throw new Error("Data karya Supabase tidak lengkap.");
  }
  const participant = value.peserta;
  if (
    typeof value.id !== "string" ||
    typeof value.peserta_id !== "string" ||
    typeof value.status !== "string" ||
    !isStatus(value.status) ||
    (value.alasan_penolakan !== null &&
      typeof value.alasan_penolakan !== "string") ||
    (value.url_karya !== null && typeof value.url_karya !== "string") ||
    (value.url_pernyataan !== null &&
      typeof value.url_pernyataan !== "string") ||
    typeof participant.id !== "string" ||
    typeof participant.nama !== "string" ||
    typeof participant.asal !== "string" ||
    (participant.kategori !== "cerita" && participant.kategori !== "komik") ||
    typeof participant.tanggal_daftar !== "string" ||
    (participant.url_kartu !== null &&
      typeof participant.url_kartu !== "string")
  ) {
    throw new Error("Format data karya Supabase tidak valid.");
  }

  return {
    id: value.id,
    peserta_id: value.peserta_id,
    status: value.status,
    alasan_penolakan: value.alasan_penolakan,
    url_karya: value.url_karya,
    url_pernyataan: value.url_pernyataan,
    peserta: {
      id: participant.id,
      nama: participant.nama,
      asal: participant.asal,
      kategori: participant.kategori,
      tanggal_daftar: participant.tanggal_daftar,
      url_kartu: participant.url_kartu,
    },
  };
}

function parseRiwayatRow(value: unknown): RiwayatRow {
  if (
    !isRecord(value) ||
    !isRecord(value.panitia) ||
    typeof value.id !== "string" ||
    typeof value.karya_id !== "string" ||
    typeof value.status_lama !== "string" ||
    !isStatus(value.status_lama) ||
    typeof value.status_baru !== "string" ||
    !isStatus(value.status_baru) ||
    (value.alasan_penolakan !== null &&
      typeof value.alasan_penolakan !== "string") ||
    typeof value.waktu !== "string" ||
    typeof value.panitia.nama !== "string"
  ) {
    throw new Error("Format riwayat status Supabase tidak valid.");
  }
  return {
    id: value.id,
    karya_id: value.karya_id,
    status_lama: value.status_lama,
    status_baru: value.status_baru,
    alasan_penolakan: value.alasan_penolakan,
    waktu: value.waktu,
    panitia: { nama: value.panitia.nama },
  };
}

function toItem(row: KaryaRow): KaryaDaftarItem {
  const berkas: BerkasKarya[] = [];
  if (row.url_karya) {
    berkas.push({
      label: `Karya — ${row.peserta.nama}`,
      href: row.url_karya,
      jenis: "karya",
      isDemo: false,
    });
  }
  if (row.peserta.url_kartu) {
    berkas.push({
      label: `${row.peserta.kategori === "cerita" ? "Kartu Mahasiswa" : "Kartu Pelajar"} — ${row.peserta.nama}`,
      href: row.peserta.url_kartu,
      jenis: "kartu",
      isDemo: false,
    });
  }
  if (row.url_pernyataan) {
    berkas.push({
      label: `Lembar Pernyataan Keaslian — ${row.peserta.nama}`,
      href: row.url_pernyataan,
      jenis: "pernyataan",
      isDemo: false,
    });
  }

  return {
    karya: {
      id: row.id,
      pesertaId: row.peserta_id,
      status: row.status,
      urlKarya: row.url_karya ?? "",
      urlPernyataan: row.url_pernyataan ?? "",
    },
    alasanPenolakan: row.alasan_penolakan,
    peserta: {
      id: row.peserta.id,
      nama: row.peserta.nama,
      asal: row.peserta.asal,
      kategori: row.peserta.kategori,
      tanggalDaftar: row.peserta.tanggal_daftar,
    },
    berkas,
  };
}

const KARYA_SELECT =
  "id,peserta_id,status,alasan_penolakan,url_karya,url_pernyataan,peserta!inner(id,nama,asal,kategori,tanggal_daftar,url_kartu)";

function toHistory(row: RiwayatRow): PanitiaRiwayatStatus {
  if (!isStatus(row.status_lama) || !isStatus(row.status_baru)) {
    throw new Error(`Riwayat status karya ${row.karya_id} tidak valid.`);
  }
  return {
    id: row.id,
    status_lama: row.status_lama,
    status_baru: row.status_baru,
    alasan_penolakan: row.alasan_penolakan,
    waktu: row.waktu,
    panitia: row.panitia,
  };
}

export async function getPanitiaKaryaByKategori(kategori: KategoriLomba) {
  await requireStaffRole("panitia");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("karya")
    .select(KARYA_SELECT)
    .eq("peserta.kategori", kategori)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Daftar karya gagal dimuat: ${error.message}`);
  }

  const rows = (data ?? []).map(parseKaryaRow);
  const items = rows.map(toItem);
  const ids = items.map(({ karya }) => karya.id);
  if (ids.length === 0) {
    const historyByKarya: Record<string, PanitiaRiwayatStatus[]> = {};
    return { items, historyByKarya };
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("riwayat_panitia")
    .select(
      "id,karya_id,status_lama,status_baru,alasan_penolakan,waktu,panitia:profiles!riwayat_panitia_panitia_id_fkey(nama)",
    )
    .in("karya_id", ids)
    .order("waktu", { ascending: false });

  if (historyError) {
    throw new Error(`Riwayat verifikasi gagal dimuat: ${historyError.message}`);
  }

  const historyByKarya: Record<string, PanitiaRiwayatStatus[]> = {};
  for (const value of historyRows ?? []) {
    const raw = parseRiwayatRow(value);
    const history = toHistory(raw);
    (historyByKarya[raw.karya_id] ??= []).push(history);
  }

  return { items, historyByKarya };
}

export async function getPanitiaKaryaById(id: string) {
  await requireStaffRole("panitia");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("karya")
    .select(KARYA_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Detail karya gagal dimuat: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("riwayat_panitia")
    .select(
      "id,karya_id,status_lama,status_baru,alasan_penolakan,waktu,panitia:profiles!riwayat_panitia_panitia_id_fkey(nama)",
    )
    .eq("karya_id", id)
    .order("waktu", { ascending: false });

  if (historyError) {
    throw new Error(`Riwayat verifikasi gagal dimuat: ${historyError.message}`);
  }

  return {
    item: toItem(parseKaryaRow(data)),
    history: (historyRows ?? []).map(parseRiwayatRow).map(toHistory),
  };
}
