"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTanggal } from "@/lib/format-tanggal";
import {
  akanKehilanganPeringkat,
  batalkanKandidat,
  kosongkanPeringkat,
  tetapkanPeringkat,
  useStateJuri,
  type PeringkatKategori,
} from "@/lib/state-juri";
import { useNotifikasi } from "@/components/ui/Notifikasi";
import Notifikasi from "@/components/ui/Notifikasi";
import type { JuriContoh } from "@/lib/juri-contoh";

type SlotPeringkat = {
  karyaId: string;
  nama: string;
};

type Konfirmasi =
  | { jenis: "ganti"; peringkat: number; namaPenghuni: string }
  | { jenis: "pindah"; dari: number; ke: number }
  | { jenis: "kosongkan"; peringkat: number }
  | { jenis: "batalkan"; peringkatHilang: number | null };

type AksiKandidatJuriProps = {
  karyaId: string;
  namaPeserta: string;
  juriAktif: JuriContoh;
  dipilihAktif: boolean;
  peringkat?: PeringkatKategori;
  jumlahPeringkat: number;
  slotByRank: Record<number, SlotPeringkat>;
};

export default function AksiKandidatJuri({
  karyaId,
  namaPeserta,
  juriAktif,
  dipilihAktif,
  peringkat,
  jumlahPeringkat,
  slotByRank,
}: AksiKandidatJuriProps) {
  const { error: stateError } = useStateJuri();
  const [selectedRank, setSelectedRank] = useState<number | "">("");
  const [pending, setPending] = useState<Konfirmasi | null>(null);
  const [error, setError] = useState("");
  const { notifikasi, tampilkanNotifikasi, tutupNotifikasi } = useNotifikasi();
  const activeRank = selectedRank === "" ? peringkat?.peringkat ?? "" : selectedRank;
  const activeSlot = activeRank === "" ? undefined : slotByRank[activeRank];
  const replacingOther =
    activeSlot !== undefined && activeSlot.karyaId !== karyaId;
  const moving =
    peringkat !== undefined &&
    activeRank !== "" &&
    activeRank !== peringkat.peringkat;

  function setErrorFrom(cause: unknown, fallback: string) {
    setError(cause instanceof Error ? cause.message : fallback);
  }

  function applyRank(replaceOccupant = false) {
    if (activeRank === "") {
      return;
    }
    try {
      tetapkanPeringkat(karyaId, juriAktif.id, activeRank, {
        gantiPenghuni: replaceOccupant,
      });
      setError("");
      setPending(null);
      tampilkanNotifikasi(
        peringkat
          ? `${namaPeserta} dipindahkan ke peringkat ${activeRank}.`
          : `${namaPeserta} ditetapkan pada peringkat ${activeRank}.`,
      );
    } catch (cause) {
      setErrorFrom(cause, "Peringkat gagal disimpan.");
    }
  }

  function requestSetRank() {
    if (activeRank === "" || activeRank === peringkat?.peringkat) {
      return;
    }
    if (replacingOther && activeSlot) {
      setPending({
        jenis: "ganti",
        peringkat: activeRank,
        namaPenghuni: activeSlot.nama,
      });
      return;
    }
    if (moving && peringkat) {
      setPending({
        jenis: "pindah",
        dari: peringkat.peringkat,
        ke: activeRank,
      });
      return;
    }
    applyRank();
  }

  function requestCancelChoice() {
    const peringkatHilang = akanKehilanganPeringkat(karyaId, juriAktif.id);
    setPending({ jenis: "batalkan", peringkatHilang });
  }

  function confirmPending() {
    if (!pending) {
      return;
    }
    try {
      switch (pending.jenis) {
        case "ganti":
          applyRank(true);
          return;
        case "pindah":
          applyRank();
          return;
        case "kosongkan":
          kosongkanPeringkat(karyaId, juriAktif.id);
          tampilkanNotifikasi(`Peringkat ${pending.peringkat} dikosongkan.`);
          break;
        case "batalkan":
          batalkanKandidat(
            karyaId,
            juriAktif.id,
            pending.peringkatHilang === null
              ? undefined
              : { hapusPeringkat: true },
          );
          tampilkanNotifikasi(
            pending.peringkatHilang === null
              ? `${namaPeserta} dihapus dari pilihan Anda.`
              : `Pilihan ${namaPeserta} dibatalkan dan peringkat ${pending.peringkatHilang} dihapus.`,
          );
          break;
      }
      setPending(null);
      setError("");
    } catch (cause) {
      setErrorFrom(cause, "Aksi gagal disimpan.");
    }
  }

  const confirmationText = (() => {
    if (!pending) {
      return "";
    }
    switch (pending.jenis) {
      case "ganti":
        return `Peringkat ${pending.peringkat} saat ini ditempati ${pending.namaPenghuni}. Ganti dengan ${namaPeserta}? ${pending.namaPenghuni} kehilangan peringkat tetapi tetap kandidat.`;
      case "pindah":
        return `Pindahkan ${namaPeserta} dari peringkat ${pending.dari} ke ${pending.ke}? Peringkat ${pending.dari} akan kosong.`;
      case "kosongkan":
        return `Kosongkan peringkat ${pending.peringkat} untuk ${namaPeserta}?`;
      case "batalkan":
        return pending.peringkatHilang === null
          ? `Batalkan pilihan kandidat Anda untuk ${namaPeserta}?`
          : `${namaPeserta} sedang di peringkat ${pending.peringkatHilang}. Membatalkan pilihan ini juga menghapus peringkatnya.`;
    }
  })();

  return (
    <div className="mt-3 border-t border-[#edf1ee] pt-3">
      <Notifikasi notifikasi={notifikasi} onClose={tutupNotifikasi} />
      <div className="flex flex-wrap items-end gap-2">
        <Link
          href={`/juri/karya/${karyaId}`}
          className="rounded-lg bg-[#245c4f] px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#19483e]"
        >
          Lihat karya
        </Link>
        {dipilihAktif && (
          <button
            type="button"
            onClick={requestCancelChoice}
            className="rounded-lg border border-[#d9c6bd] bg-white px-3 py-2.5 text-[10px] font-semibold text-[#8d4b37] hover:bg-[#fff8f4]"
          >
            Batalkan pilihan saya
          </button>
        )}
        <label className="grid gap-1 text-[10px] font-medium text-[#718079]">
          Pilih slot peringkat
          <select
            value={activeRank}
            onChange={(event) =>
              setSelectedRank(
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            className="h-9 min-w-[180px] rounded-lg border border-[#dfe6e2] bg-white px-2 text-xs text-[#42564e] outline-none focus:border-[#6b9b86]"
          >
            <option value="">Pilih peringkat</option>
            {Array.from({ length: jumlahPeringkat }, (_, index) => {
              const slot = index + 1;
              const occupant = slotByRank[slot];
              return (
                <option key={slot} value={slot}>
                  {slot} - {occupant?.nama ?? "Kosong"}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          onClick={requestSetRank}
          disabled={
            activeRank === "" ||
            activeRank === peringkat?.peringkat
          }
          className="rounded-lg border border-[#b8cec1] bg-[#f2f8f4] px-3 py-2.5 text-[10px] font-semibold text-[#28634d] hover:bg-[#eaf4ef] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tetapkan
        </button>
        {peringkat && (
          <button
            type="button"
            onClick={() =>
              setPending({ jenis: "kosongkan", peringkat: peringkat.peringkat })
            }
            className="rounded-lg border border-[#d9c6bd] bg-white px-3 py-2.5 text-[10px] font-semibold text-[#8d4b37] hover:bg-[#fff8f4]"
          >
            Kosongkan peringkat
          </button>
        )}
      </div>

      {peringkat && (
        <p className="mt-2 text-[10px] text-[#718079]">
          Ditetapkan oleh {peringkat.ditetapkanOleh} pada{" "}
          {formatTanggal(peringkat.ditetapkanPada.slice(0, 10))}
        </p>
      )}

      {pending && (
        <div className="mt-3 rounded-lg border border-[#f0d7b8] bg-[#fffaf2] p-3">
          <p className="text-xs text-[#755527]">{confirmationText}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmPending}
              className="rounded-md bg-[#9e5337] px-3 py-2 text-xs font-semibold text-white hover:bg-[#84432d]"
            >
              {pending.jenis === "batalkan" &&
              pending.peringkatHilang !== null
                ? "Ya, batalkan pilihan dan hapus peringkat"
                : pending.jenis === "ganti"
                  ? "Ya, ganti penghuni"
                  : pending.jenis === "batalkan"
                    ? "Ya, batalkan pilihan"
                    : pending.jenis === "kosongkan"
                      ? "Ya, kosongkan"
                      : "Ya, pindahkan"}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-md border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#52675f]"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {(error || stateError) && (
        <p role="alert" className="mt-2 text-xs font-medium text-[#a33340]">
          {error || stateError}
        </p>
      )}
    </div>
  );
}
