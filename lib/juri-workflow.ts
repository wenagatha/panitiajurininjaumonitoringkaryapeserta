import "server-only";

import { requireStaffRole, type StaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KaryaDaftarItem } from "@/components/dashboard/KaryaCategoryList";
import type { PanitiaRiwayatStatus } from "@/lib/panitia-actions";
import type { KategoriLomba, StatusKarya } from "@/types/karya";

export type JuriSelection = {
  karyaId: string;
  juriId: string;
  juriNama: string;
  ditandaiPada: string;
};

export type JuriRank = {
  karyaId: string;
  kategori: KategoriLomba;
  peringkat: number;
  ditetapkanOleh: string;
  ditetapkanOlehNama: string;
  ditetapkanPada: string;
};

export type JuriHistory = {
  id: string;
  jenis: "jadikan-kandidat" | "batalkan-kandidat" | "tetapkan-peringkat" | "pindah-peringkat" | "hapus-peringkat";
  karyaId: string;
  juriId: string;
  juriNama: string;
  nilaiLama: string | null;
  nilaiBaru: string | null;
  waktu: string;
  catatan: string | null;
};

export type JuriReview = {
  karyaId: string;
  juriId: string;
  juriNama: string;
  status: "sedang" | "sudah";
  mulaiPada: string;
  terakhirAktif: string;
  selesaiPada: string | null;
};

export type JuriWorkflowSnapshot = {
  judges: { id: string; nama: string }[];
  selections: JuriSelection[];
  ranks: JuriRank[];
  history: JuriHistory[];
  reviews: JuriReview[];
};

type ParticipantRow = {
  id: string;
  nama: string;
  asal: string;
  kategori: KategoriLomba;
  tanggal_daftar: string;
  url_kartu: string | null;
};

type WorkRow = {
  id: string;
  peserta_id: string;
  status: StatusKarya;
  alasan_penolakan: string | null;
  url_karya: string | null;
  url_pernyataan: string | null;
  peserta: ParticipantRow;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is StatusKarya {
  return (
    typeof value === "string" &&
    ["menunggu", "diproses", "diverifikasi", "ditolak"].includes(value)
  );
}

function parseWork(value: unknown): WorkRow {
  if (!isRecord(value) || !isRecord(value.peserta)) {
    throw new Error("Data karya Supabase tidak lengkap.");
  }
  const participant = value.peserta;
  if (
    typeof value.id !== "string" ||
    typeof value.peserta_id !== "string" ||
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

function parsePanitiaStatusHistory(value: unknown): {
  karyaId: string;
  entry: PanitiaRiwayatStatus;
} {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.karya_id !== "string" ||
    !isStatus(value.status_lama) ||
    !isStatus(value.status_baru) ||
    (value.alasan_penolakan !== null &&
      typeof value.alasan_penolakan !== "string") ||
    typeof value.waktu !== "string"
  ) {
    throw new Error("Riwayat status karya Supabase tidak valid.");
  }
  const panitiaName =
    isRecord(value.panitia) && typeof value.panitia.nama === "string"
      ? value.panitia.nama
      : "Panitia";
  return {
    karyaId: value.karya_id,
    entry: {
      id: value.id,
      status_lama: value.status_lama,
      status_baru: value.status_baru,
      alasan_penolakan: value.alasan_penolakan,
      waktu: value.waktu,
      panitia: { nama: panitiaName },
    },
  };
}

function toItem(row: WorkRow): KaryaDaftarItem {
  const berkas: KaryaDaftarItem["berkas"] = [];
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

function parseProfile(value: unknown): { id: string; nama: string } {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.nama !== "string") {
    throw new Error("Data profil juri tidak valid.");
  }
  return { id: value.id, nama: value.nama };
}

function parseSelection(value: unknown): JuriSelection {
  if (!isRecord(value) || typeof value.karya_id !== "string" || typeof value.juri_id !== "string" || typeof value.ditandai_pada !== "string") {
    throw new Error("Data pilihan kandidat juri tidak valid.");
  }
  return {
    karyaId: value.karya_id,
    juriId: value.juri_id,
    juriNama: parseProfile(value.juri).nama,
    ditandaiPada: value.ditandai_pada,
  };
}

function parseRank(value: unknown): JuriRank {
  if (
    !isRecord(value) ||
    typeof value.karya_id !== "string" ||
    (value.kategori !== "cerita" && value.kategori !== "komik") ||
    typeof value.peringkat !== "number" ||
    typeof value.ditetapkan_oleh !== "string" ||
    typeof value.ditetapkan_pada !== "string"
  ) {
    throw new Error("Data peringkat juri tidak valid.");
  }
  return {
    karyaId: value.karya_id,
    kategori: value.kategori,
    peringkat: value.peringkat,
    ditetapkanOleh: value.ditetapkan_oleh,
    ditetapkanOlehNama: parseProfile(value.juri).nama,
    ditetapkanPada: value.ditetapkan_pada,
  };
}

const HISTORY_KINDS: readonly JuriHistory["jenis"][] = [
  "jadikan-kandidat",
  "batalkan-kandidat",
  "tetapkan-peringkat",
  "pindah-peringkat",
  "hapus-peringkat",
];

function parseHistory(value: unknown): JuriHistory {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.jenis !== "string" ||
    !HISTORY_KINDS.includes(value.jenis as JuriHistory["jenis"]) ||
    typeof value.karya_id !== "string" ||
    typeof value.juri_id !== "string" ||
    typeof value.waktu !== "string" ||
    (value.nilai_lama !== null && typeof value.nilai_lama !== "string") ||
    (value.nilai_baru !== null && typeof value.nilai_baru !== "string") ||
    (value.catatan !== null && typeof value.catatan !== "string")
  ) {
    throw new Error("Riwayat aksi juri tidak valid.");
  }
  return {
    id: value.id,
    jenis: value.jenis as JuriHistory["jenis"],
    karyaId: value.karya_id,
    juriId: value.juri_id,
    juriNama: parseProfile(value.juri).nama,
    nilaiLama: value.nilai_lama,
    nilaiBaru: value.nilai_baru,
    waktu: value.waktu,
    catatan: value.catatan,
  };
}

function parseReview(value: unknown): JuriReview {
  if (
    !isRecord(value) ||
    typeof value.karya_id !== "string" ||
    typeof value.juri_id !== "string" ||
    (value.status !== "sedang" && value.status !== "sudah") ||
    typeof value.mulai_pada !== "string" ||
    typeof value.terakhir_aktif !== "string" ||
    (value.selesai_pada !== null && typeof value.selesai_pada !== "string")
  ) {
    throw new Error("Data tinjauan juri tidak valid.");
  }
  return {
    karyaId: value.karya_id,
    juriId: value.juri_id,
    juriNama: parseProfile(value.juri).nama,
    status: value.status,
    mulaiPada: value.mulai_pada,
    terakhirAktif: value.terakhir_aktif,
    selesaiPada: value.selesai_pada,
  };
}

const WORK_SELECT =
  "id,peserta_id,status,alasan_penolakan,url_karya,url_pernyataan,peserta!inner(id,nama,asal,kategori,tanggal_daftar,url_kartu)";
const PROFILE_RELATION = "juri:profiles!{table}_juri_id_fkey(id,nama)";

export async function getJuriWorkflowData(
  kategori: KategoriLomba,
  role: StaffRole,
  includeRejected = false,
): Promise<{
  items: KaryaDaftarItem[];
  workflow: JuriWorkflowSnapshot;
  statusHistoryByKarya: Record<string, PanitiaRiwayatStatus[]>;
}> {
  await requireStaffRole(role);
  const supabase = await createClient();
  const worksResult = await supabase
    .from("karya")
    .select(WORK_SELECT)
    .eq("peserta.kategori", kategori)
    .in("status", includeRejected ? ["diverifikasi", "ditolak"] : ["diverifikasi"])
    .order("created_at", { ascending: false });
  if (worksResult.error) {
    throw new Error(`Daftar karya kategori ${kategori} gagal dimuat: ${worksResult.error.message}`);
  }

  const items = (worksResult.data ?? []).map(parseWork).map(toItem);
  const karyaIds = items.map(({ karya }) => karya.id);
  if (karyaIds.length === 0) {
    return {
      items,
      workflow: { judges: [], selections: [], ranks: [], history: [], reviews: [] },
      statusHistoryByKarya: {},
    };
  }

  const [judgeResult, selectionResult, ranksResult, historyResult, reviewsResult, statusHistoryResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,nama")
        .eq("role", "juri")
        .eq("kategori", kategori),
      supabase
        .from("pilihan_juri")
        .select(`karya_id,juri_id,ditandai_pada,${PROFILE_RELATION.replace("{table}", "pilihan_juri")}`)
        .in("karya_id", karyaIds),
      supabase
        .from("peringkat_karya")
        .select("karya_id,kategori,peringkat,ditetapkan_oleh,ditetapkan_pada,juri:profiles!peringkat_karya_ditetapkan_oleh_fkey(id,nama)")
        .eq("kategori", kategori),
      supabase
        .from("riwayat_juri")
        .select(`id,jenis,karya_id,juri_id,nilai_lama,nilai_baru,waktu,catatan,${PROFILE_RELATION.replace("{table}", "riwayat_juri")}`)
        .in("karya_id", karyaIds)
        .order("waktu", { ascending: false }),
      supabase
        .from("tinjauan_juri")
        .select(`karya_id,juri_id,status,mulai_pada,terakhir_aktif,selesai_pada,${PROFILE_RELATION.replace("{table}", "tinjauan_juri")}`)
        .in("karya_id", karyaIds),
      supabase
        .from("riwayat_panitia")
        .select("id,karya_id,status_lama,status_baru,alasan_penolakan,waktu")
        .in("karya_id", karyaIds)
        .order("waktu", { ascending: false }),
    ]);

  if (judgeResult.error) {
    throw new Error(`Daftar juri kategori gagal dimuat: ${judgeResult.error.message}`);
  }
  if ((judgeResult.data ?? []).length === 0) {
    throw new Error(`Profil juri kategori ${kategori} tidak ditemukan.`);
  }

  if (selectionResult.error) {
    throw new Error(`Pilihan kandidat gagal dimuat: ${selectionResult.error.message}`);
  }
  if (ranksResult.error) {
    throw new Error(`Peringkat juri gagal dimuat: ${ranksResult.error.message}`);
  }
  if (historyResult.error) {
    throw new Error(`Riwayat juri gagal dimuat: ${historyResult.error.message}`);
  }
  if (reviewsResult.error) {
    throw new Error(`Status tinjauan juri gagal dimuat: ${reviewsResult.error.message}`);
  }
  if (statusHistoryResult.error) {
    throw new Error(`Riwayat status karya gagal dimuat: ${statusHistoryResult.error.message}`);
  }

  const statusHistoryByKarya: Record<string, PanitiaRiwayatStatus[]> = {};
  for (const value of statusHistoryResult.data ?? []) {
    const history = parsePanitiaStatusHistory(value);
    (statusHistoryByKarya[history.karyaId] ??= []).push(history.entry);
  }

  return {
    items,
    workflow: {
      judges: (judgeResult.data ?? []).map(parseProfile),
      selections: (selectionResult.data ?? []).map(parseSelection),
      ranks: (ranksResult.data ?? []).map(parseRank),
      history: (historyResult.data ?? [])
        .map(parseHistory)
        .filter((entry) => entry.karyaId),
      reviews: (reviewsResult.data ?? []).map(parseReview),
    },
    statusHistoryByKarya,
  };
}

export async function getJuriWorkDetail(
  karyaId: string,
  kategori: KategoriLomba,
): Promise<{
  item: KaryaDaftarItem;
  workflow: JuriWorkflowSnapshot;
  history: PanitiaRiwayatStatus[];
} | null> {
  const { items, workflow, statusHistoryByKarya } = await getJuriWorkflowData(
    kategori,
    "juri",
    true,
  );
  const item = items.find(({ karya }) => karya.id === karyaId);
  return item
    ? {
        item,
        workflow,
        history: statusHistoryByKarya[item.karya.id] ?? [],
      }
    : null;
}

export async function getJuriKaryaForCategory(
  kategori: KategoriLomba,
): Promise<KaryaDaftarItem[]> {
  const { items } = await getJuriWorkflowData(kategori, "juri");
  return items;
}
