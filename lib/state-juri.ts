"use client";

import { useSyncExternalStore } from "react";
import {
  ATURAN_LOMBA,
  BATAS_AKTIF_MENIT,
} from "@/lib/aturan-lomba";
import { JURI_CONTOH, type JuriContoh } from "@/lib/juri-contoh";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";
import { readReviewStatuses } from "@/lib/review-status";
import type { KategoriLomba } from "@/types/karya";

export const STATE_JURI_STORAGE_KEY = "monitoring-karya-state-juri-v2";
const STATE_JURI_EVENT = "monitoring-karya-state-juri-change";
// TODO: ganti dengan tabel tinjauan_juri dan pilihan_juri di Supabase (Realtime Presence untuk "sedang ditinjau").

export type TinjauanJuri = {
  status: "sedang" | "sudah";
  mulaiPada: string;
  terakhirAktif: string;
  selesaiPada: string | null;
};

export type PilihanKandidatJuri = {
  ditandaiPada: string;
};

export type PeringkatJuri = {
  peringkat: number;
  ditetapkanOleh: string;
  ditetapkanPada: string;
};

export type RiwayatJuri = {
  id: string;
  jenis:
    | "jadikan-kandidat"
    | "batalkan-kandidat"
    | "tetapkan-peringkat"
    | "pindah-peringkat"
    | "hapus-peringkat";
  karyaId: string;
  juriId: string;
  nilaiLama: string | null;
  nilaiBaru: string | null;
  waktu: string;
  catatan?: string | null;
};

export type StateJuri = {
  tinjauan: Record<string, TinjauanJuri>;
  pilihanKandidat: Record<string, PilihanKandidatJuri>;
  peringkat: Record<string, PeringkatJuri>;
  riwayat: RiwayatJuri[];
};

export type StateJuriSnapshot = {
  state: StateJuri;
  error: string;
};

export type KandidatKategori = {
  karyaId: string;
  juriIds: string[];
  ditandaiPada: string;
};

export type PeringkatKategori = {
  karyaId: string;
  peringkat: number;
  ditetapkanOleh: string;
  ditetapkanPada: string;
};

export type StatusTinjauanJuri = "belum" | "sedang" | "sudah";

function kunci(karyaId: string, juriId: string): string {
  return `${karyaId}|${juriId}`;
}

function getDefaultState(): StateJuri {
  const tinjauan: StateJuri["tinjauan"] = {};
  const pilihanKandidat: StateJuri["pilihanKandidat"] = {};
  const peringkat: StateJuri["peringkat"] = {};
  const juriByName = new Map(JURI_CONTOH.map((juri) => [juri.nama, juri]));

  for (const karya of karyaContoh) {
    if (karya.tahap === "kandidat" && karya.status === "diverifikasi") {
      for (const namaJuri of karya.dipilihOleh) {
        const juri = juriByName.get(namaJuri);
        if (juri) {
          const id = kunci(karya.id, juri.id);
          pilihanKandidat[id] = { ditandaiPada: karya.ditandaiPada };
          tinjauan[id] = {
            status: "sudah",
            mulaiPada: karya.ditandaiPada,
            terakhirAktif: karya.ditandaiPada,
            selesaiPada: karya.ditandaiPada,
          };
        }
      }
    }

    if (
      karya.peringkat !== null &&
      karya.ditetapkanOleh &&
      karya.ditetapkanPada
    ) {
      peringkat[karya.id] = {
        peringkat: karya.peringkat,
        ditetapkanOleh: karya.ditetapkanOleh,
        ditetapkanPada: karya.ditetapkanPada,
      };
    }
  }

  return { tinjauan, pilihanKandidat, peringkat, riwayat: [] };
}

const DEFAULT_STATE = getDefaultState();
const DEFAULT_SNAPSHOT: StateJuriSnapshot = {
  state: structuredClone(DEFAULT_STATE),
  error: "",
};
let cachedSnapshot: StateJuriSnapshot = DEFAULT_SNAPSHOT;
let cachedRaw: string | null | undefined;

const listeners = new Set<() => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isHistoryValue(value: unknown): value is string | null {
  return (
    value === null ||
    value === "kandidat" ||
    (typeof value === "string" && /^\d+$/.test(value))
  );
}

function isHistoryType(
  value: unknown,
): value is RiwayatJuri["jenis"] {
  return (
    value === "jadikan-kandidat" ||
    value === "batalkan-kandidat" ||
    value === "tetapkan-peringkat" ||
    value === "pindah-peringkat" ||
    value === "hapus-peringkat"
  );
}

function parseState(raw: string | null): StateJuri {
  if (raw === null) {
    return structuredClone(DEFAULT_STATE);
  }

  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("Data aksi juri di browser tidak valid.");
  }

  if (
    !isRecord(parsed.tinjauan) ||
    !isRecord(parsed.pilihanKandidat) ||
    !isRecord(parsed.peringkat) ||
    !Array.isArray(parsed.riwayat)
  ) {
    throw new Error("Data aksi juri di browser tidak lengkap.");
  }

  const tinjauan: StateJuri["tinjauan"] = {};
  for (const [id, review] of Object.entries(parsed.tinjauan)) {
    if (
      !isRecord(review) ||
      (review.status !== "sedang" && review.status !== "sudah") ||
      !isIsoDate(review.mulaiPada) ||
      !isIsoDate(review.terakhirAktif) ||
      (review.selesaiPada !== null && !isIsoDate(review.selesaiPada))
    ) {
      throw new Error("Data status tinjauan juri di browser tidak valid.");
    }
    tinjauan[id] = {
      status: review.status,
      mulaiPada: review.mulaiPada,
      terakhirAktif: review.terakhirAktif,
      selesaiPada: review.selesaiPada,
    };
  }

  const pilihanKandidat: StateJuri["pilihanKandidat"] = {};
  for (const [id, choice] of Object.entries(parsed.pilihanKandidat)) {
    if (!isRecord(choice) || !isIsoDate(choice.ditandaiPada)) {
      throw new Error("Data pilihan kandidat juri di browser tidak valid.");
    }
    pilihanKandidat[id] = { ditandaiPada: choice.ditandaiPada };
  }

  const peringkat: StateJuri["peringkat"] = {};
  for (const [id, rank] of Object.entries(parsed.peringkat)) {
    if (
      !isRecord(rank) ||
      typeof rank.peringkat !== "number" ||
      !Number.isInteger(rank.peringkat) ||
      typeof rank.ditetapkanOleh !== "string" ||
      !isIsoDate(rank.ditetapkanPada)
    ) {
      throw new Error("Data peringkat juri di browser tidak valid.");
    }
    peringkat[id] = {
      peringkat: rank.peringkat,
      ditetapkanOleh: rank.ditetapkanOleh,
      ditetapkanPada: rank.ditetapkanPada,
    };
  }

  const riwayat: RiwayatJuri[] = [];
  for (const entry of parsed.riwayat) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      !isHistoryType(entry.jenis) ||
      typeof entry.karyaId !== "string" ||
      typeof entry.juriId !== "string" ||
      !isHistoryValue(entry.nilaiLama) ||
      !isHistoryValue(entry.nilaiBaru) ||
      (entry.catatan !== undefined &&
        entry.catatan !== null &&
        typeof entry.catatan !== "string") ||
      !isIsoDate(entry.waktu)
    ) {
      throw new Error("Data riwayat aksi juri di browser tidak valid.");
    }
    riwayat.push({
      id: entry.id,
      jenis: entry.jenis,
      karyaId: entry.karyaId,
      juriId: entry.juriId,
      nilaiLama: entry.nilaiLama,
      nilaiBaru: entry.nilaiBaru,
      waktu: entry.waktu,
      ...(entry.catatan !== undefined ? { catatan: entry.catatan } : {}),
    });
  }

  return { tinjauan, pilihanKandidat, peringkat, riwayat };
}

function emitChange() {
  window.dispatchEvent(new Event(STATE_JURI_EVENT));
}

function getSnapshot(): StateJuriSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SNAPSHOT;
  }

  let raw: string | null | undefined;
  try {
    raw = window.localStorage.getItem(STATE_JURI_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }
    cachedSnapshot = { state: parseState(raw), error: "" };
    cachedRaw = raw;
  } catch (cause) {
    const error =
      cause instanceof Error
        ? `Aksi juri gagal dibaca: ${cause.message}`
        : "Aksi juri gagal dibaca dari penyimpanan browser.";
    if (cachedSnapshot.error !== error) {
      cachedSnapshot = { state: cachedSnapshot.state, error };
    }
    if (raw !== undefined) {
      cachedRaw = raw;
    }
  }
  return cachedSnapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", handleStorageChange);
  }
  window.addEventListener(STATE_JURI_EVENT, listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageChange);
    }
    window.removeEventListener(STATE_JURI_EVENT, listener);
  };
}

function handleStorageChange(event: StorageEvent) {
  if (event.key === null || event.key === STATE_JURI_STORAGE_KEY) {
    cachedRaw = undefined;
    getSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }
}

function readState(): StateJuri {
  try {
    return parseState(window.localStorage.getItem(STATE_JURI_STORAGE_KEY));
  } catch (cause) {
    throw new Error(
      cause instanceof Error
        ? `Aksi juri gagal dibaca: ${cause.message}`
        : "Aksi juri gagal dibaca dari penyimpanan browser.",
    );
  }
}

function writeState(state: StateJuri): void {
  try {
    const raw = JSON.stringify(state);
    window.localStorage.setItem(STATE_JURI_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = { state: structuredClone(state), error: "" };
    emitChange();
  } catch (cause) {
    throw new Error(
      cause instanceof Error
        ? `Aksi juri gagal disimpan: ${cause.message}`
        : "Aksi juri gagal disimpan ke penyimpanan browser.",
    );
  }
}

function recordDecision(
  state: StateJuri,
  jenis: RiwayatJuri["jenis"],
  karyaId: string,
  juriId: string,
  nilaiLama: string | null,
  nilaiBaru: string | null,
  waktu: string,
  catatan?: string | null,
) {
  state.riwayat.push({
    id: `${waktu}-${state.riwayat.length + 1}`,
    jenis,
    karyaId,
    juriId,
    nilaiLama,
    nilaiBaru,
    waktu,
    ...(catatan !== undefined ? { catatan } : {}),
  });
}

export function useStateJuri(): StateJuriSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT);
}

export function statusTinjauanJuri(
  karyaId: string,
  juriId: string,
  now: number,
): StatusTinjauanJuri {
  const review = getSnapshot().state.tinjauan[kunci(karyaId, juriId)];
  if (!review) {
    return "belum";
  }
  if (
    review.status === "sedang" &&
    now - new Date(review.terakhirAktif).getTime() >
      BATAS_AKTIF_MENIT * 60_000
  ) {
    return "belum";
  }
  return review.status;
}

export function waktuTinjauanJuri(
  karyaId: string,
  juriId: string,
  now: number,
): TinjauanJuri | undefined {
  const review = getSnapshot().state.tinjauan[kunci(karyaId, juriId)];
  return review && statusTinjauanJuri(karyaId, juriId, now) !== "belum"
    ? review
    : undefined;
}

function pilihanAktif(
  state: StateJuri,
  karyaId: string,
  juriId: string,
): PilihanKandidatJuri | undefined {
  return state.pilihanKandidat[kunci(karyaId, juriId)];
}

export function daftarJuriKandidat(
  karyaId: string,
  state: StateJuri,
): JuriContoh[] {
  return JURI_CONTOH.filter((juri) =>
    pilihanAktif(state, karyaId, juri.id),
  );
}

export function jumlahKandidatKategori(
  kategori: KategoriLomba,
  state: StateJuri,
): number {
  return getKandidatKategori(kategori, state).length;
}

export function getKandidatKategori(
  kategori: KategoriLomba,
  state: StateJuri,
): KandidatKategori[] {
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );

  return karyaContoh
    .flatMap((karya) => {
      const peserta = pesertaById.get(karya.pesertaId);
      if (!peserta || peserta.kategori !== kategori) {
        return [];
      }
      const juriPilihan = JURI_CONTOH.flatMap((juri) => {
        const pilihan = pilihanAktif(state, karya.id, juri.id);
        return pilihan ? [{ juriId: juri.id, pilihan }] : [];
      });
      if (juriPilihan.length === 0) {
        return [];
      }
      const ditandaiPada = juriPilihan
        .map(({ pilihan }) => pilihan.ditandaiPada)
        .sort((first, second) => Date.parse(first) - Date.parse(second))[0];
      return [
        {
          karyaId: karya.id,
          juriIds: juriPilihan.map(({ juriId }) => juriId),
          ditandaiPada,
        },
      ];
    })
    .sort(
      (first, second) =>
        Date.parse(first.ditandaiPada) - Date.parse(second.ditandaiPada),
    );
}

export function getPeringkatKategori(
  kategori: KategoriLomba,
  state: StateJuri,
): PeringkatKategori[] {
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  const karyaById = new Map(karyaContoh.map((karya) => [karya.id, karya]));
  const ranks = new Set<number>();
  const result: PeringkatKategori[] = [];

  for (const [karyaId, rank] of Object.entries(state.peringkat)) {
    const karya = karyaById.get(karyaId);
    const peserta = karya ? pesertaById.get(karya.pesertaId) : undefined;
    if (!karya || !peserta || peserta.kategori !== kategori) {
      continue;
    }
    if (process.env.NODE_ENV === "development") {
      if (
        karya.status !== "diverifikasi" ||
        !JURI_CONTOH.some((juri) => pilihanAktif(state, karyaId, juri.id))
      ) {
        throw new Error(
          `Karya ${karyaId} memiliki peringkat tetapi bukan kandidat terverifikasi.`,
        );
      }
      if (ranks.has(rank.peringkat)) {
        throw new Error(
          `Peringkat ${rank.peringkat} digunakan lebih dari satu karya pada kategori ${kategori}.`,
        );
      }
    }
    ranks.add(rank.peringkat);
    result.push({ karyaId, ...rank });
  }

  return result
    .filter((rank) => rank.peringkat <= ATURAN_LOMBA[kategori].jumlahPeringkat)
    .sort((first, second) => first.peringkat - second.peringkat);
}

function getKaryaAndKategori(karyaId: string) {
  const karya = karyaContoh.find((entry) => entry.id === karyaId);
  const peserta = karya
    ? pesertaByIdForJuri.get(karya.pesertaId)
    : undefined;
  return karya && peserta ? { karya, peserta } : undefined;
}

function getJudgeInCategory(
  karyaId: string,
  juriId: string,
): { kategori: KategoriLomba } {
  const juri = JURI_CONTOH.find((entry) => entry.id === juriId);
  const data = getKaryaAndKategori(karyaId);
  if (!juri || !data || juri.kategori !== data.peserta.kategori) {
    throw new Error("Karya dan juri harus berasal dari kategori yang sama.");
  }
  return { kategori: juri.kategori };
}

function selectedJudgesInCategory(
  state: StateJuri,
  karyaId: string,
  kategori: KategoriLomba,
): JuriContoh[] {
  return JURI_CONTOH.filter(
    (juri) =>
      juri.kategori === kategori && Boolean(pilihanAktif(state, karyaId, juri.id)),
  );
}

function findRankOccupant(
  state: StateJuri,
  kategori: KategoriLomba,
  peringkat: number,
): string | undefined {
  const found: string[] = [];
  for (const [karyaId, rank] of Object.entries(state.peringkat)) {
    const data = getKaryaAndKategori(karyaId);
    if (data?.peserta.kategori === kategori && rank.peringkat === peringkat) {
      found.push(karyaId);
    }
  }
  if (found.length > 1) {
    throw new Error(`Peringkat ${peringkat} digunakan oleh lebih dari satu karya.`);
  }
  return found[0];
}

export function penghuniPeringkat(
  kategori: KategoriLomba,
  peringkat: number,
): string | undefined {
  return findRankOccupant(getSnapshot().state, kategori, peringkat);
}

export function peringkatKarya(karyaId: string): number | undefined {
  return getSnapshot().state.peringkat[karyaId]?.peringkat;
}

export function akanKehilanganPeringkat(
  karyaId: string,
  juriId: string,
): number | null {
  const state = getSnapshot().state;
  const pilihanAktifJuri = pilihanAktif(state, karyaId, juriId);
  const rank = state.peringkat[karyaId]?.peringkat;
  const juri = JURI_CONTOH.find((entry) => entry.id === juriId);
  const data = getKaryaAndKategori(karyaId);
  if (
    !pilihanAktifJuri ||
    rank === undefined ||
    !juri ||
    !data ||
    juri.kategori !== data.peserta.kategori
  ) {
    return null;
  }
  const remaining = selectedJudgesInCategory(state, karyaId, juri.kategori)
    .some((juriPemilih) => juriPemilih.id !== juriId);
  return remaining ? null : rank;
}

export function useKandidatKategori(kategori: KategoriLomba) {
  const { state, error } = useStateJuri();
  return { kandidat: getKandidatKategori(kategori, state), error };
}

export function usePeringkatKategori(kategori: KategoriLomba) {
  const { state, error } = useStateJuri();
  return { peringkat: getPeringkatKategori(kategori, state), error };
}

function kategoriKarya(karyaId: string, juriId: string): KategoriLomba {
  const juri = JURI_CONTOH.find((entry) => entry.id === juriId);
  const karya = karyaContoh.find((entry) => entry.id === karyaId);
  const peserta = karya
    ? pesertaByIdForJuri.get(karya.pesertaId)
    : undefined;
  if (!juri || !karya || !peserta || juri.kategori !== peserta.kategori) {
    throw new Error("Karya atau juri tidak sesuai dengan kategori.");
  }
  if (
    (readReviewStatuses()[karyaId] ?? karya.status) !== "diverifikasi"
  ) {
    throw new Error("Juri hanya dapat menandai karya yang sudah diverifikasi.");
  }
  return peserta.kategori;
}

const pesertaByIdForJuri = new Map(
  pesertaContoh.map((peserta) => [peserta.id, peserta]),
);

export function mulaiTinjau(karyaId: string, juriId: string): void {
  kategoriKarya(karyaId, juriId);
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (current?.status === "sudah") {
    return;
  }
  const now = new Date().toISOString();
  const stillActive =
    current?.status === "sedang" &&
    Date.now() - Date.parse(current.terakhirAktif) <=
      BATAS_AKTIF_MENIT * 60_000;
  state.tinjauan[id] = {
    status: "sedang",
    mulaiPada: stillActive ? current.mulaiPada : now,
    terakhirAktif: now,
    selesaiPada: null,
  };
  writeState(state);
}

export function kirimDetak(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (
    current?.status !== "sedang" ||
    Date.now() - Date.parse(current.terakhirAktif) >
      BATAS_AKTIF_MENIT * 60_000
  ) {
    return;
  }
  state.tinjauan[id] = {
    ...current,
    terakhirAktif: new Date().toISOString(),
  };
  writeState(state);
}

export function akhiriTinjau(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  if (state.tinjauan[id]?.status !== "sedang") {
    return;
  }
  delete state.tinjauan[id];
  writeState(state);
}

export function tandaiSudahDitinjau(karyaId: string, juriId: string): void {
  kategoriKarya(karyaId, juriId);
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (current?.status === "sudah") {
    return;
  }
  const now = new Date().toISOString();
  state.tinjauan[id] = {
    status: "sudah",
    mulaiPada: current?.mulaiPada ?? now,
    terakhirAktif: now,
    selesaiPada: now,
  };
  writeState(state);
}

export function batalkanSudahDitinjau(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  if (state.tinjauan[id]?.status !== "sudah") {
    return;
  }
  delete state.tinjauan[id];
  writeState(state);
}

export function jadikanKandidat(karyaId: string, juriId: string): void {
  const kategori = kategoriKarya(karyaId, juriId);
  const state = readState();
  const id = kunci(karyaId, juriId);
  if (pilihanAktif(state, karyaId, juriId)) {
    return;
  }
  if (state.tinjauan[id]?.status !== "sudah") {
    throw new Error("Tandai sudah ditinjau sebelum memilih kandidat.");
  }
  const candidateExists = JURI_CONTOH.some((juri) =>
    pilihanAktif(state, karyaId, juri.id),
  );
  if (
    !candidateExists &&
    jumlahKandidatKategori(kategori, state) >=
      ATURAN_LOMBA[kategori].batasKandidat
  ) {
    throw new Error("Kuota kandidat penuh.");
  }
  const now = new Date().toISOString();
  state.pilihanKandidat[id] = { ditandaiPada: now };
  recordDecision(
    state,
    "jadikan-kandidat",
    karyaId,
    juriId,
    null,
    "kandidat",
    now,
  );
  writeState(state);
}

export function tetapkanPeringkat(
  karyaId: string,
  juriId: string,
  peringkat: number,
  opsi: { gantiPenghuni?: boolean } = {},
): void {
  // TODO: kunci perubahan jika pengumuman sudah dirilis berdasarkan tabel pengaturan.
  const kategori = kategoriKarya(karyaId, juriId);
  if (
    !Number.isInteger(peringkat) ||
    peringkat < 1 ||
    peringkat > ATURAN_LOMBA[kategori].jumlahPeringkat
  ) {
    throw new Error(
      `Peringkat harus berupa bilangan bulat dari 1 sampai ${ATURAN_LOMBA[kategori].jumlahPeringkat}.`,
    );
  }

  const state = readState();
  if (selectedJudgesInCategory(state, karyaId, kategori).length === 0) {
    throw new Error("Karya harus menjadi kandidat sebelum diberi peringkat.");
  }
  const occupantId = findRankOccupant(state, kategori, peringkat);
  if (occupantId === karyaId) {
    return;
  }
  if (occupantId && !opsi.gantiPenghuni) {
    const occupant = getKaryaAndKategori(occupantId);
    throw new Error(
      `Peringkat ${peringkat} sudah ditempati ${occupant?.peserta.nama ?? "karya lain"}.`,
    );
  }

  const now = new Date().toISOString();
  if (occupantId) {
    const oldRank = state.peringkat[occupantId];
    if (!oldRank) {
      throw new Error("Peringkat yang akan diganti tidak ditemukan.");
    }
    delete state.peringkat[occupantId];
    recordDecision(
      state,
      "hapus-peringkat",
      occupantId,
      juriId,
      String(oldRank.peringkat),
      null,
      now,
      `Diganti oleh ${getKaryaAndKategori(karyaId)?.peserta.nama ?? "karya lain"}`,
    );
  }

  const currentRank = state.peringkat[karyaId];
  state.peringkat[karyaId] = {
    peringkat,
    ditetapkanOleh:
      JURI_CONTOH.find((juri) => juri.id === juriId)?.nama ?? "",
    ditetapkanPada: now,
  };
  recordDecision(
    state,
    currentRank ? "pindah-peringkat" : "tetapkan-peringkat",
    karyaId,
    juriId,
    currentRank ? String(currentRank.peringkat) : null,
    String(peringkat),
    now,
  );
  writeState(state);
}

export function kosongkanPeringkat(karyaId: string, juriId: string): void {
  getJudgeInCategory(karyaId, juriId);
  const state = readState();
  const currentRank = state.peringkat[karyaId];
  if (!currentRank) {
    return;
  }
  delete state.peringkat[karyaId];
  const now = new Date().toISOString();
  recordDecision(
    state,
    "hapus-peringkat",
    karyaId,
    juriId,
    String(currentRank.peringkat),
    null,
    now,
    "Dikosongkan manual",
  );
  writeState(state);
}

export function batalkanKandidat(
  karyaId: string,
  juriId: string,
  opsi: { hapusPeringkat?: boolean } = {},
): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  if (!pilihanAktif(state, karyaId, juriId)) {
    return;
  }
  const juri = JURI_CONTOH.find((entry) => entry.id === juriId);
  const data = getKaryaAndKategori(karyaId);
  if (!juri || !data || juri.kategori !== data.peserta.kategori) {
    throw new Error("Karya dan juri harus berasal dari kategori yang sama.");
  }
  const rank = state.peringkat[karyaId];
  const lastChoice =
    rank &&
    selectedJudgesInCategory(state, karyaId, juri.kategori).every(
      (juriPemilih) => juriPemilih.id === juriId,
    );
  if (lastChoice && !opsi.hapusPeringkat) {
    throw new Error(
      `Membatalkan pilihan terakhir akan menghapus peringkat ${rank.peringkat}.`,
    );
  }
  delete state.pilihanKandidat[id];
  const now = new Date().toISOString();
  recordDecision(
    state,
    "batalkan-kandidat",
    karyaId,
    juriId,
    "kandidat",
    null,
    now,
  );
  if (lastChoice && rank) {
    delete state.peringkat[karyaId];
    recordDecision(
      state,
      "hapus-peringkat",
      karyaId,
      juriId,
      String(rank.peringkat),
      null,
      now,
      "Pilihan terakhir dibatalkan",
    );
  }
  writeState(state);
}
