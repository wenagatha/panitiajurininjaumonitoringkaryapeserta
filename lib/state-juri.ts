"use client";

import { useSyncExternalStore } from "react";
import {
  ATURAN_LOMBA,
  BATAS_AKTIF_MENIT,
} from "@/lib/aturan-lomba";
import { JURI_CONTOH, type JuriContoh } from "@/lib/juri-contoh";
import { karyaContoh, pesertaContoh } from "@/lib/data-contoh";
import type { KategoriLomba } from "@/types/karya";

export const STATE_JURI_STORAGE_KEY = "monitoring-karya-state-juri";
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
  jenis: string;
  karyaId: string;
  juriId: string;
  nilaiLama: string | null;
  nilaiBaru: string | null;
  waktu: string;
};

export type StateJuri = {
  tinjauan: Record<string, TinjauanJuri>;
  pilihanKandidat: Record<string, PilihanKandidatJuri | null>;
  peringkat: Record<string, PeringkatJuri>;
  riwayat: RiwayatJuri[];
};

export type StateJuriSnapshot = {
  state: StateJuri;
  error: string;
};

type StatusTinjauan = "belum" | "sedang" | "sudah";

function kunci(karyaId: string, juriId: string): string {
  return `${karyaId}|${juriId}`;
}

function getDefaultState(): StateJuri {
  const pilihanKandidat: StateJuri["pilihanKandidat"] = {};
  const peringkat: StateJuri["peringkat"] = {};
  const juriByName = new Map(JURI_CONTOH.map((juri) => [juri.nama, juri]));

  for (const karya of karyaContoh) {
    if (karya.tahap === "kandidat") {
      for (const namaJuri of karya.dipilihOleh) {
        const juri = juriByName.get(namaJuri);
        if (juri) {
          pilihanKandidat[kunci(karya.id, juri.id)] = {
            ditandaiPada: karya.ditandaiPada,
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

  return { tinjauan: {}, pilihanKandidat, peringkat, riwayat: [] };
}

const DEFAULT_STATE = getDefaultState();
const DEFAULT_SNAPSHOT: StateJuriSnapshot = {
  state: DEFAULT_STATE,
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

function parseState(raw: string | null): StateJuri {
  if (!raw) {
    return DEFAULT_STATE;
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
    if (choice === null) {
      pilihanKandidat[id] = null;
    } else {
      if (!isRecord(choice) || !isIsoDate(choice.ditandaiPada)) {
        throw new Error("Data pilihan kandidat juri di browser tidak valid.");
      }
      pilihanKandidat[id] = { ditandaiPada: choice.ditandaiPada };
    }
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
  const riwayat: StateJuri["riwayat"] = [];
  for (const entry of parsed.riwayat) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.jenis !== "string" ||
      typeof entry.karyaId !== "string" ||
      typeof entry.juriId !== "string" ||
      (entry.nilaiLama !== null && typeof entry.nilaiLama !== "string") ||
      (entry.nilaiBaru !== null && typeof entry.nilaiBaru !== "string") ||
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
    });
  }

  return {
    tinjauan,
    pilihanKandidat: {
      ...DEFAULT_STATE.pilihanKandidat,
      ...pilihanKandidat,
    },
    peringkat: { ...DEFAULT_STATE.peringkat, ...peringkat },
    riwayat,
  };
}

function emitChange() {
  window.dispatchEvent(new Event(STATE_JURI_EVENT));
}

function getSnapshot(): StateJuriSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SNAPSHOT;
  }

  try {
    const raw = window.localStorage.getItem(STATE_JURI_STORAGE_KEY);
    if (raw === cachedRaw && !cachedSnapshot.error) {
      return cachedSnapshot;
    }
    cachedSnapshot = { state: parseState(raw), error: "" };
    cachedRaw = raw;
  } catch (cause) {
    cachedSnapshot = {
      state: cachedSnapshot.state,
      error:
        cause instanceof Error
          ? `Aksi juri gagal dibaca: ${cause.message}`
          : "Aksi juri gagal dibaca dari penyimpanan browser.",
    };
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
    cachedSnapshot = { state, error: "" };
    emitChange();
  } catch (cause) {
    throw new Error(
      cause instanceof Error
        ? `Aksi juri gagal disimpan: ${cause.message}`
        : "Aksi juri gagal disimpan ke penyimpanan browser.",
    );
  }
}

function recordChange(
  state: StateJuri,
  jenis: string,
  karyaId: string,
  juriId: string,
  nilaiLama: string | null,
  nilaiBaru: string | null,
  waktu: string,
) {
  state.riwayat.push({
    id: `${waktu}-${state.riwayat.length + 1}`,
    jenis,
    karyaId,
    juriId,
    nilaiLama,
    nilaiBaru,
    waktu,
  });
}

export function useStateJuri(): StateJuriSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT);
}

export function statusTinjauanJuri(
  karyaId: string,
  juriId: string,
): StatusTinjauan {
  const review = getSnapshot().state.tinjauan[kunci(karyaId, juriId)];
  if (!review) {
    return "belum";
  }
  if (
    review.status === "sedang" &&
    Date.now() - new Date(review.terakhirAktif).getTime() >
      BATAS_AKTIF_MENIT * 60_000
  ) {
    return "belum";
  }
  return review.status;
}

export function waktuTinjauanJuri(
  karyaId: string,
  juriId: string,
): TinjauanJuri | undefined {
  const review = getSnapshot().state.tinjauan[kunci(karyaId, juriId)];
  return review && statusTinjauanJuri(karyaId, juriId) !== "belum"
    ? review
    : undefined;
}

function pilihanAktif(
  state: StateJuri,
  karyaId: string,
  juriId: string,
): PilihanKandidatJuri | undefined {
  const id = kunci(karyaId, juriId);
  if (Object.prototype.hasOwnProperty.call(state.pilihanKandidat, id)) {
    return state.pilihanKandidat[id] ?? undefined;
  }
  return DEFAULT_STATE.pilihanKandidat[id] ?? undefined;
}

export function daftarJuriKandidat(karyaId: string): JuriContoh[] {
  const state = getSnapshot().state;
  return JURI_CONTOH.filter((juri) =>
    pilihanAktif(state, karyaId, juri.id),
  );
}

export function jumlahKandidatKategori(kategori: KategoriLomba): number {
  const pesertaById = new Map(
    pesertaContoh.map((peserta) => [peserta.id, peserta]),
  );
  const state = getSnapshot().state;
  const kandidatIds = new Set<string>();

  for (const karya of karyaContoh) {
    const peserta = pesertaById.get(karya.pesertaId);
    if (
      peserta?.kategori === kategori &&
      JURI_CONTOH.some((juri) => pilihanAktif(state, karya.id, juri.id))
    ) {
      kandidatIds.add(karya.id);
    }
  }
  return kandidatIds.size;
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
  if (karya.status !== "diverifikasi") {
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
  const wasActive = statusTinjauanJuri(karyaId, juriId) === "sedang";
  state.tinjauan[id] = {
    status: "sedang",
    mulaiPada: wasActive ? current?.mulaiPada ?? now : now,
    terakhirAktif: now,
    selesaiPada: null,
  };
  recordChange(
    state,
    "mulai-tinjau",
    karyaId,
    juriId,
    wasActive ? "sedang" : "belum",
    "sedang",
    now,
  );
  writeState(state);
}

export function kirimDetak(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (
    current?.status !== "sedang" ||
    statusTinjauanJuri(karyaId, juriId) !== "sedang"
  ) {
    return;
  }
  const now = new Date().toISOString();
  state.tinjauan[id] = { ...current, terakhirAktif: now };
  recordChange(state, "kirim-detak", karyaId, juriId, "sedang", "sedang", now);
  writeState(state);
}

export function akhiriTinjau(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (current?.status !== "sedang") {
    return;
  }
  const now = new Date().toISOString();
  delete state.tinjauan[id];
  recordChange(state, "akhiri-tinjau", karyaId, juriId, "sedang", "belum", now);
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
  recordChange(
    state,
    "tandai-sudah-ditinjau",
    karyaId,
    juriId,
    current?.status ?? "belum",
    "sudah",
    now,
  );
  writeState(state);
}

export function batalkanSudahDitinjau(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = state.tinjauan[id];
  if (!current || current.status !== "sudah") {
    return;
  }
  const now = new Date().toISOString();
  delete state.tinjauan[id];
  recordChange(state, "batalkan-sudah-ditinjau", karyaId, juriId, "sudah", "belum", now);
  writeState(state);
}

export function jadikanKandidat(karyaId: string, juriId: string): void {
  const kategori = kategoriKarya(karyaId, juriId);
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = pilihanAktif(state, karyaId, juriId);
  if (current) {
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
    jumlahKandidatKategori(kategori) >= ATURAN_LOMBA[kategori].batasKandidat
  ) {
    throw new Error("Kuota kandidat penuh.");
  }
  const now = new Date().toISOString();
  state.pilihanKandidat[id] = { ditandaiPada: now };
  recordChange(state, "jadikan-kandidat", karyaId, juriId, null, now, now);
  writeState(state);
}

export function batalkanKandidat(karyaId: string, juriId: string): void {
  const state = readState();
  const id = kunci(karyaId, juriId);
  const current = pilihanAktif(state, karyaId, juriId);
  if (!current) {
    return;
  }
  const now = new Date().toISOString();
  state.pilihanKandidat[id] = null;
  recordChange(
    state,
    "batalkan-kandidat",
    karyaId,
    juriId,
    current.ditandaiPada,
    null,
    now,
  );
  writeState(state);
}
