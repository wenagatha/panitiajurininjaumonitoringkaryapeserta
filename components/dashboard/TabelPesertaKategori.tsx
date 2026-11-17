"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPanitiaKaryaStatusHistory,
  updatePanitiaKaryaStatus,
  type PanitiaRiwayatStatus,
} from "@/lib/panitia-actions";
import {
  getStatusLabel,
  getStatusStyle,
  STATUS_KARYA_TANPA_MENUNGGU,
} from "@/lib/status";
import { normalisasiWhatsApp } from "@/lib/normalisasi-whatsapp";
import type { StatusKarya } from "@/types/karya";
import type { PesertaKategoriRow } from "@/types/peserta-dashboard";

const PAGE_SIZE = 10;

function formatTanggal(tanggal: string): string {
  const date = new Date(`${tanggal}T00:00:00`);
  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWaktu(waktu: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waktu));
}

function labelLomba(kategori: PesertaKategoriRow["kategori"]): string {
  return kategori === "cerita" ? "Cerita HAM" : "Komik Bergambar";
}

export default function TabelPesertaKategori({
  rows,
}: {
  rows: PesertaKategoriRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusKarya>(
    "semua",
  );
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingKaryaId, setSavingKaryaId] = useState<string | null>(null);
  const [pendingRejectionId, setPendingRejectionId] = useState<string | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusError, setStatusError] = useState("");
  const [historyByKarya, setHistoryByKarya] = useState<
    Record<string, PanitiaRiwayatStatus[]>
  >({});
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>(
    {},
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());

  const filteredRows = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("id-ID");
    return rows
      .filter((row) => {
        const status = row.karya.status;
        const matchesSearch =
          !searchTerm ||
          row.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
          row.asal.toLocaleLowerCase("id-ID").includes(searchTerm) ||
          row.email.toLocaleLowerCase("id-ID").includes(searchTerm) ||
          row.whatsapp.toLocaleLowerCase("id-ID").includes(searchTerm);
        return (
          matchesSearch &&
          (filterStatus === "semua" || status === filterStatus)
        );
      })
      .sort(
        (first, second) =>
          new Date(second.tanggalDaftar).getTime() -
          new Date(first.tanggalDaftar).getTime(),
      );
  }, [filterStatus, query, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const counts: Record<"total" | StatusKarya, number> = {
      total: rows.length,
      menunggu: 0,
      diproses: 0,
      diverifikasi: 0,
      ditolak: 0,
    };
    for (const row of rows) {
      counts[row.karya.status] += 1;
    }
    return counts;
  }, [rows]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const timeoutId = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setPendingRejectionId(null);
        setRejectionReason("");
        setStatusError("");
        setHistoryOpenId(null);
        rowRefs.current.get(selectedId)?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedId]);

  function closePanel() {
    if (selectedId) {
      rowRefs.current.get(selectedId)?.focus();
      setSelectedId(null);
      setPendingRejectionId(null);
      setRejectionReason("");
      setStatusError("");
      setHistoryOpenId(null);
    }
  }

  async function toggleHistory(karyaId: string) {
    if (historyOpenId === karyaId) {
      setHistoryOpenId(null);
      return;
    }

    setHistoryOpenId(karyaId);
    setHistoryErrors((current) => ({ ...current, [karyaId]: "" }));
    if (loadingHistoryId === karyaId) {
      return;
    }

    setLoadingHistoryId(karyaId);
    try {
      const history = await getPanitiaKaryaStatusHistory(karyaId);
      setHistoryByKarya((current) => ({ ...current, [karyaId]: history }));
    } catch (cause) {
      setHistoryErrors((current) => ({
        ...current,
        [karyaId]:
          cause instanceof Error
            ? cause.message
            : "Riwayat perubahan status gagal dimuat.",
      }));
    } finally {
      setLoadingHistoryId((current) =>
        current === karyaId ? null : current,
      );
    }
  }

  async function saveStatus(
    karyaId: string,
    status: StatusKarya,
    reason?: string,
  ): Promise<boolean> {
    setStatusError("");
    setSavingKaryaId(karyaId);
    try {
      const { history } = await updatePanitiaKaryaStatus(
        karyaId,
        status,
        reason,
      );
      if (history) {
        setHistoryByKarya((current) => {
          if (!Object.prototype.hasOwnProperty.call(current, karyaId)) {
            return current;
          }
          return {
            ...current,
            [karyaId]: [
              history,
              ...current[karyaId].filter((entry) => entry.id !== history.id),
            ],
          };
        });
      }
      setPendingRejectionId(null);
      setRejectionReason("");
      router.refresh();
      return true;
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Status karya gagal disimpan.",
      );
      return false;
    } finally {
      setSavingKaryaId(null);
    }
  }

  function handleStatusChange(karyaId: string, status: StatusKarya) {
    setStatusError("");
    if (status === "ditolak") {
      setPendingRejectionId(karyaId);
      setRejectionReason("");
      return;
    }
    setPendingRejectionId(null);
    setRejectionReason("");
    void saveStatus(karyaId, status);
  }

  function markAsReviewedOnOpen(row: PesertaKategoriRow) {
    if (
      row.karya.status === "menunggu" &&
      savingKaryaId !== row.karya.id
    ) {
      setPendingRejectionId(null);
      setRejectionReason("");
      void saveStatus(row.karya.id, "diproses");
    }
  }

  const statCards = [
    { key: "total", label: "Total peserta", color: "#00a477" },
    { key: "diproses", label: "Ditinjau", color: "#69a9ee" },
    { key: "diverifikasi", label: "Diverifikasi", color: "#245c4f" },
    { key: "ditolak", label: "Ditolak", color: "#e86d79" },
  ] as const;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-[#dce5e0] border-t-[3px] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.035)]"
            style={{ borderTopColor: card.color }}
          >
            <p className="text-xs text-[#84918b]">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-[#24453b]">
              {stats[card.key]}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#5196d8] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#29463d]">Daftar peserta</h2>
            <p className="mt-1 text-xs text-[#84918b]">
              Cari dan lihat informasi peserta lomba.
            </p>
          </div>
          <p className="text-xs text-[#84918b]">
            {filteredRows.length} peserta ditemukan
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="sr-only" htmlFor="category-participant-search">
            Cari nama, asal, email, atau WhatsApp
          </label>
          <input
            id="category-participant-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, asal, email, atau WhatsApp"
            className="h-10 min-w-0 rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
          />
          <label className="sr-only" htmlFor="category-participant-status">
            Filter status
          </label>
          <select
            id="category-participant-status"
            value={filterStatus}
            onChange={(event) => {
              setFilterStatus(event.target.value as "semua" | StatusKarya);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-[#dfe6e2] bg-white px-3 text-xs text-[#42564e] outline-none focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
          >
            <option value="semua">Semua status</option>
            {STATUS_KARYA_TANPA_MENUNGGU.map((status) => (
              <option key={status.value} value={status.value}>
                {getStatusLabel(status.value)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e8eeea] text-[10px] font-semibold tracking-[0.04em] text-[#84908b]">
                <th scope="col" className="px-2 py-3">PESERTA</th>
                <th scope="col" className="px-2 py-3">EMAIL</th>
                <th scope="col" className="px-2 py-3">WHATSAPP</th>
                <th scope="col" className="px-2 py-3">DAFTAR</th>
                <th scope="col" className="px-2 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const status = row.karya.status;
                const statusStyle = getStatusStyle(status);
                const whatsapp = normalisasiWhatsApp(row.whatsapp);
                return (
                  <tr
                    key={row.id}
                    ref={(element) => {
                      if (element) {
                        rowRefs.current.set(row.id, element);
                      } else {
                        rowRefs.current.delete(row.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Detail peserta ${row.nama}`}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        event.target === event.currentTarget
                      ) {
                        event.preventDefault();
                        setSelectedId(row.id);
                      }
                    }}
                    className="cursor-pointer border-b border-[#edf1ee] outline-none last:border-0 hover:bg-[#f8fbf9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6b9b86]"
                  >
                    <td className="px-2 py-3">
                      <p className="text-xs font-semibold text-[#345248]">{row.nama}</p>
                      <p className="mt-0.5 text-[10px] text-[#89958f]">{row.asal}</p>
                    </td>
                    <td className="max-w-[220px] px-2 py-3 text-xs text-[#63716b]">
                      <a
                        href={`mailto:${row.email}`}
                        title={row.email}
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate text-[#3d7563] hover:underline"
                      >
                        {row.email}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-xs text-[#63716b]">
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-[#3d7563] hover:underline"
                      >
                        {row.whatsapp}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-xs text-[#63716b]">
                      {formatTanggal(row.tanggalDaftar)}
                    </td>
                    <td className="px-2 py-3">
                      {status !== "menunggu" && statusStyle && (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badgeClass}`}>
                          {getStatusLabel(status)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-10 text-center text-xs text-[#87938e]">
                    Tidak ada peserta yang cocok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#edf1ee] pt-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <p aria-live="polite" className="text-xs text-[#84918b]">
            Halaman {currentPage} dari {pageCount}
          </p>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(pageCount, current + 1))
            }
            disabled={currentPage === pageCount}
            className="rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </section>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#18352d]/35">
          <button
            type="button"
            aria-label="Tutup detail peserta"
            onClick={closePanel}
            className="absolute inset-0 cursor-default"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-detail-title"
            tabIndex={-1}
            className="relative z-10 h-full w-full max-w-[480px] overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="participant-detail-title" className="text-lg font-bold text-[#24453b]">
                  {selectedRow.nama}
                </h2>
                <p className="mt-1 text-sm text-[#84918b]">{selectedRow.asal}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Tutup panel detail"
                onClick={closePanel}
                className="rounded-lg border border-[#dfe6e2] px-3 py-2 text-sm text-[#465e56] hover:bg-[#f6f8f7]"
              >
                ×
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-b border-[#e8eeea] pb-5">
              <div>
                <dt className="text-xs text-[#84918b]">Lomba</dt>
                <dd className="mt-1 text-sm font-medium text-[#345248]">
                  {labelLomba(selectedRow.kategori)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#84918b]">Tanggal daftar</dt>
                <dd className="mt-1 text-sm font-medium text-[#345248]">
                  {formatTanggal(selectedRow.tanggalDaftar)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-[#84918b]">Status</dt>
                <dd className="mt-1">
                  {(() => {
                    const status =
                      pendingRejectionId === selectedRow.karya.id
                        ? "ditolak"
                        : selectedRow.karya.status;
                    const style = getStatusStyle(status);
                    return (
                      <select
                        aria-label={`Status karya ${selectedRow.nama}`}
                        value={status === "menunggu" ? "" : status}
                        disabled={savingKaryaId === selectedRow.karya.id}
                        onChange={(event) =>
                          handleStatusChange(
                            selectedRow.karya.id,
                            event.target.value as StatusKarya,
                          )
                        }
                        className={`h-8 rounded-full border border-[#d6e0da] bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#6b9b86]/20 disabled:opacity-60 ${style?.badgeClass ?? ""}`}
                      >
                        {status === "menunggu" && (
                          <option value="" disabled>
                            Pilih status
                          </option>
                        )}
                        {STATUS_KARYA_TANPA_MENUNGGU.map((option) => (
                          <option key={option.value} value={option.value}>
                            {getStatusLabel(option.value)}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                  {savingKaryaId === selectedRow.karya.id && (
                    <span className="ml-2 text-xs text-[#84918b]">
                      Menyimpan...
                    </span>
                  )}
                  <button
                    type="button"
                    aria-expanded={historyOpenId === selectedRow.karya.id}
                    aria-controls={`participant-status-history-${selectedRow.karya.id}`}
                    onClick={() => void toggleHistory(selectedRow.karya.id)}
                    className="mt-2 rounded-md border border-[#d6e0da] px-3 py-1.5 text-xs font-semibold text-[#345248] hover:bg-[#f5faf7]"
                  >
                    {historyOpenId === selectedRow.karya.id
                      ? "Sembunyikan riwayat"
                      : "Lihat riwayat status"}
                  </button>
                </dd>
                {pendingRejectionId === selectedRow.karya.id && (
                  <div className="mt-3 rounded-lg border border-[#f1c7ce] bg-[#fff7f8] p-3">
                    <label
                      htmlFor="participant-rejection-reason"
                      className="block text-xs font-semibold text-[#8b3443]"
                    >
                      Alasan penolakan (wajib)
                    </label>
                    <textarea
                      id="participant-rejection-reason"
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      maxLength={1000}
                      rows={3}
                      required
                      className="mt-2 w-full rounded-md border border-[#e4c4c9] bg-white px-3 py-2 text-xs text-[#354a42] outline-none focus:border-[#b85b6b] focus:ring-2 focus:ring-[#b85b6b]/15"
                      placeholder="Jelaskan alasan karya ditolak..."
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          savingKaryaId === selectedRow.karya.id ||
                          rejectionReason.trim().length === 0
                        }
                        onClick={() =>
                          void saveStatus(
                            selectedRow.karya.id,
                            "ditolak",
                            rejectionReason,
                          )
                        }
                        className="rounded-md bg-[#a33340] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Simpan penolakan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingRejectionId(null);
                          setRejectionReason("");
                          setStatusError("");
                        }}
                        className="rounded-md border border-[#d9c9cc] px-3 py-2 text-xs font-semibold text-[#6e5459]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
                {statusError && (
                  <p role="alert" className="mt-2 text-xs text-[#a33340]">
                    {statusError}
                  </p>
                )}
              </div>
            </dl>

            {historyOpenId === selectedRow.karya.id && (
              <section
                id={`participant-status-history-${selectedRow.karya.id}`}
                aria-label="Riwayat perubahan status"
                className="mt-4 rounded-lg border border-[#dce5e0] bg-[#f8fbf9] p-3"
              >
                <h3 className="text-sm font-bold text-[#29463d]">
                  Riwayat status
                </h3>
                {loadingHistoryId === selectedRow.karya.id ? (
                  <p role="status" className="mt-2 text-xs text-[#84918b]">
                    Memuat riwayat...
                  </p>
                ) : historyErrors[selectedRow.karya.id] ? (
                  <p role="alert" className="mt-2 text-xs text-[#a33340]">
                    {historyErrors[selectedRow.karya.id]}
                  </p>
                ) : historyByKarya[selectedRow.karya.id]?.length ? (
                  <ol className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-2">
                    {historyByKarya[selectedRow.karya.id].map((entry) => (
                      <li
                        key={entry.id}
                        className="border-l-2 border-[#b8d4c4] pl-3"
                      >
                        <p className="text-xs font-medium text-[#345248]">
                          {getStatusLabel(entry.status_lama)} →{" "}
                          {getStatusLabel(entry.status_baru)}
                        </p>
                        <p className="mt-1 text-xs text-[#63716b]">
                          Oleh {entry.panitia.nama}
                        </p>
                        <time
                          dateTime={entry.waktu}
                          className="mt-1 block text-[11px] text-[#84918b]"
                        >
                          {formatWaktu(entry.waktu)}
                        </time>
                        {entry.alasan_penolakan && (
                          <p className="mt-1 text-xs text-[#8b3443]">
                            Alasan: {entry.alasan_penolakan}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs text-[#84918b]">
                    Belum ada riwayat perubahan status.
                  </p>
                )}
              </section>
            )}

            <section className="mt-5">
              <h3 className="text-sm font-bold text-[#29463d]">Kontak</h3>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-xs text-[#84918b]">Email</dt>
                  <dd className="mt-1 break-all text-sm text-[#3d7563]">
                    <a href={`mailto:${selectedRow.email}`}>{selectedRow.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#84918b]">WhatsApp</dt>
                  <dd className="mt-1 text-sm text-[#3d7563]">
                    <a
                      href={`https://wa.me/${normalisasiWhatsApp(selectedRow.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedRow.whatsapp}
                    </a>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-5">
              <h3 className="text-sm font-bold text-[#29463d]">Berkas</h3>
              <p className="mt-1 text-xs text-[#84918b]">
                Membuka berkas akan mengubah status awal menjadi Ditinjau.
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  {
                    label: "Karya PDF",
                    href: selectedRow.karya.urlKarya,
                  },
                  {
                    label:
                      selectedRow.kategori === "cerita"
                        ? "Kartu Mahasiswa"
                        : "Kartu Pelajar",
                    href: selectedRow.urlKartu,
                  },
                  {
                    label: "Lembar Pernyataan Keaslian",
                    href: selectedRow.karya.urlPernyataan,
                  },
                ].map((file) => (
                  <li key={file.label}>
                    {file.href ? (
                      <a
                        href={file.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markAsReviewedOnOpen(selectedRow)}
                        className="block rounded-lg border border-[#d6e0da] px-3 py-3 text-sm font-medium text-[#345248] hover:bg-[#f5faf7]"
                      >
                        {file.label}
                      </a>
                    ) : (
                      <p className="rounded-lg border border-dashed border-[#d6e0da] px-3 py-3 text-sm text-[#84918b]">
                        {file.label} belum tersedia
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
