"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTanggal } from "@/lib/format-tanggal";
import { getStatusLabel, getStatusStyle, STATUS_KARYA } from "@/lib/status";
import {
  updatePanitiaKaryaStatus,
  type PanitiaRiwayatStatus,
} from "@/lib/panitia-actions";
import {
  ATURAN_LOMBA,
  HEARTBEAT_DETIK,
} from "@/lib/aturan-lomba";
import { useJuriAktif } from "@/components/juri/JuriAktifProvider";
import { useDetakWaktu } from "@/lib/use-detak-waktu";
import { saveJuriReview, toggleJuriCandidate } from "@/lib/juri-mutations";
import type { JuriWorkflowSnapshot } from "@/lib/juri-workflow";
import Notifikasi, { useNotifikasi } from "@/components/ui/Notifikasi";
import type { StatusKarya } from "@/types/karya";
import type { KaryaDaftarItem } from "./KaryaCategoryList";

type TinjauKaryaProps = {
  item: KaryaDaftarItem;
  history?: PanitiaRiwayatStatus[];
  role?: "panitia" | "juri";
  readOnly?: boolean;
  readOnlySource?: "kandidat" | "pemenang";
  workflow?: JuriWorkflowSnapshot;
};

function formatWaktu(waktu: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(waktu));
}

export default function TinjauKarya({
  ...props
}: TinjauKaryaProps) {
  if (props.role === "juri") {
    return <TinjauKaryaJuri {...props} />;
  }
  return <TinjauKaryaContent {...props} />;
}

function TinjauKaryaJuri(props: TinjauKaryaProps) {
  const juriAktif = useJuriAktif();
  return <TinjauKaryaContent {...props} juriAktif={juriAktif} />;
}

function TinjauKaryaContent({
  item,
  history = [],
  role = "panitia",
  readOnly = false,
  readOnlySource = "kandidat",
  juriAktif,
  workflow,
}: TinjauKaryaProps & {
  juriAktif?: ReturnType<typeof useJuriAktif>;
}) {
  const router = useRouter();
  const now = useDetakWaktu(30_000);
  const [panitiaStatus, setPanitiaStatus] = useState<StatusKarya>(
    item.karya.status,
  );
  const [panitiaHistory, setPanitiaHistory] = useState(history);
  const [openFilePreviews, setOpenFilePreviews] = useState<Set<string>>(
    () => new Set(),
  );
  const status =
    role === "panitia"
      ? panitiaStatus
      : item.karya.status;
  const [draftStatus, setDraftStatus] = useState<StatusKarya>(item.karya.status);
  const [rejectionReason, setRejectionReason] = useState(
    item.alasanPenolakan ?? "",
  );
  const [saved, setSaved] = useState(false);
  const workflowData = workflow ?? {
    judges: [],
    selections: [],
    ranks: [],
    history: [],
    reviews: [],
  };
  const [trackingError, setTrackingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmCancelCandidate, setConfirmCancelCandidate] = useState(false);
  const { notifikasi, tampilkanNotifikasi, tutupNotifikasi } = useNotifikasi();
  const kategoriJudul =
    item.peserta.kategori === "cerita"
      ? "Cerita HAM"
      : role === "juri"
        ? "Komik Bergambar"
        : "Lomba Komik Bergambar";
  const karyaBaseHref = role === "panitia" ? "/panitia/karya" : "/juri/karya";
  const backHref = readOnly
    ? role === "juri"
      ? "/juri/pemenang"
      : `/panitia/${readOnlySource}/${item.peserta.kategori}`
    : role === "juri" || item.peserta.kategori === "cerita"
      ? karyaBaseHref
      : `${karyaBaseHref}/komik`;
  const visibleFiles =
    role === "juri" || readOnly
      ? item.berkas.filter((file) => file.jenis === "karya")
      : item.berkas;
  const statusStyle = getStatusStyle(status);
  const juriKategori = workflowData.judges;
  const juriAktifId = juriAktif?.id;
  const getReviewStatus = (judgeId: string) => {
    const review = workflowData.reviews.find(
      (entry) =>
        entry.karyaId === item.karya.id && entry.juriId === judgeId,
    );
    if (
      !review ||
      (review.status === "sedang" &&
        now - Date.parse(review.terakhirAktif) > 5 * 60_000)
    ) {
      return "belum";
    }
    return review.status;
  };
  const getReviewTime = (judgeId: string) =>
    workflowData.reviews.find(
      (entry) =>
        entry.karyaId === item.karya.id && entry.juriId === judgeId,
    );
  const statusAktif =
    role === "juri" && juriAktif ? getReviewStatus(juriAktif.id) : "belum";
  const juriPemilih = workflowData.selections
    .filter((selection) => selection.karyaId === item.karya.id)
    .map((selection) => ({
      id: selection.juriId,
      nama:
        workflowData.judges.find((judge) => judge.id === selection.juriId)
          ?.nama ?? selection.juriNama,
    }));
  const sudahDipilihAktif = juriPemilih.some(
    (juri) => juri.id === juriAktif?.id,
  );
  const sudahKandidat = juriPemilih.length > 0;
  const peringkatSaatIni = workflowData.ranks.find(
    (rank) => rank.karyaId === item.karya.id,
  );
  const dipilihJuriLain = juriPemilih.filter(
    (juri) => juri.id !== juriAktif?.id,
  );
  const jumlahKandidat = new Set(
    workflowData.selections.map((selection) => selection.karyaId),
  ).size;
  const kuotaPenuh =
    jumlahKandidat >= ATURAN_LOMBA[item.peserta.kategori].batasKandidat;
  const peringkatAkanHilang =
    juriPemilih.length === 1 && peringkatSaatIni
      ? peringkatSaatIni.peringkat
      : null;
  useEffect(() => {
    if (
      role !== "juri" ||
      readOnly ||
      !juriAktifId ||
      status !== "diverifikasi"
    ) {
      return;
    }

    let intervalId: number | undefined;
    let active = true;
    const stopHeartbeat = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    const startTracking = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void saveJuriReview(item.karya.id, "start")
        .then(() => {
          if (active) {
            setTrackingError("");
            router.refresh();
          }
        })
        .catch((cause) => {
          if (active) {
            setTrackingError(
              cause instanceof Error
                ? cause.message
                : "Gagal memulai tinjauan juri.",
            );
          }
        });
      if (intervalId === undefined) {
        intervalId = window.setInterval(() => {
          if (document.visibilityState === "visible") {
            void saveJuriReview(item.karya.id, "heartbeat")
              .then(() => {
                if (active) {
                  setTrackingError("");
                  router.refresh();
                }
              })
              .catch((cause) => {
                if (active) {
                  setTrackingError(
                    cause instanceof Error
                      ? cause.message
                      : "Gagal mengirim detak tinjauan.",
                  );
                }
              });
          }
        }, HEARTBEAT_DETIK * 1000);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTracking();
      } else {
        stopHeartbeat();
      }
    };

    startTracking();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void saveJuriReview(item.karya.id, "finish").catch((cause) => {
        console.error("Gagal mengakhiri tinjauan juri.", cause);
      });
    };
  }, [item.karya.id, juriAktifId, readOnly, role, router, status]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    if (role === "panitia") {
      if (status === "menunggu") {
        let active = true;
        void updatePanitiaKaryaStatus(item.karya.id, "diproses")
          .then(({ history: newHistory }) => {
            if (!active) {
              return;
            }
            setPanitiaStatus("diproses");
            setDraftStatus("diproses");
            if (newHistory) {
              setPanitiaHistory((previous) => [newHistory, ...previous]);
            }
          })
          .catch((cause: unknown) => {
            if (active) {
              setActionError(
                cause instanceof Error
                  ? cause.message
                  : "Gagal mengubah status karya menjadi Diproses.",
              );
            }
          });
        return () => {
          active = false;
        };
      }
    }

    const timeoutId = window.setTimeout(() => setDraftStatus(status), 0);
    return () => window.clearTimeout(timeoutId);
  }, [item.karya.id, readOnly, role, status]);

  async function saveDecision() {
    setActionError("");
    if (role === "panitia") {
      try {
        const { history: newHistory } = await updatePanitiaKaryaStatus(
          item.karya.id,
          draftStatus,
          draftStatus === "ditolak" ? rejectionReason : undefined,
        );
        setPanitiaStatus(draftStatus);
        if (newHistory) {
          setPanitiaHistory((previous) => [newHistory, ...previous]);
        }
        setSaved(true);
      } catch (cause) {
        setSaved(false);
        setActionError(
          cause instanceof Error
            ? cause.message
            : "Status karya gagal disimpan.",
        );
      }
    }
  }

  async function toggleSudahDitinjau() {
    if (!juriAktif) {
      return;
    }
    try {
      if (statusAktif === "sudah") {
        await saveJuriReview(item.karya.id, "unmark_done");
      } else {
        await saveJuriReview(item.karya.id, "mark_done");
        tampilkanNotifikasi("Karya ditandai sudah ditinjau.");
      }
      setActionError("");
      router.refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Gagal memperbarui penandaan tinjauan.",
      );
    }
  }

  async function toggleKandidat() {
    if (!juriAktif) {
      return;
    }
    try {
      if (sudahDipilihAktif) {
        if (!confirmCancelCandidate) {
          setConfirmCancelCandidate(true);
          return;
        }
        await toggleJuriCandidate(
          item.karya.id,
          false,
          peringkatAkanHilang !== null,
        );
        setConfirmCancelCandidate(false);
        tampilkanNotifikasi(`${item.peserta.nama} dihapus dari kandidat.`);
      } else {
        await toggleJuriCandidate(item.karya.id, true);
        tampilkanNotifikasi(
          `${item.peserta.nama} berhasil dijadikan kandidat.`,
        );
      }
      setActionError("");
      router.refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Gagal memperbarui pilihan kandidat.",
      );
    }
  }

  if (role === "juri" && status !== "diverifikasi") {
    return (
      <main className="mx-auto max-w-[820px]">
        {role === "juri" && (
          <Notifikasi notifikasi={notifikasi} onClose={tutupNotifikasi} />
        )}
        <div className="rounded-lg border border-[#dce5e0] bg-white p-5">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle?.badgeClass ?? ""}`}
          >
            {getStatusLabel(status)}
          </span>
          <p className="text-sm text-[#84918b]">
            Karya ini tidak tersedia untuk ditinjau juri.
          </p>
          {status === "ditolak" && (
            <div className="mt-3 rounded-md border-l-[3px] border-[#d95769] bg-[#fff1f3] px-3 py-2 text-xs text-[#7d3b46]">
              <p className="font-semibold">Alasan penolakan</p>
              <p className="mt-1">
                {item.alasanPenolakan ||
                  "Alasan belum dicatat untuk penolakan ini."}
              </p>
              {history
                .filter(
                  (entry) =>
                    entry.status_baru === "ditolak" &&
                    entry.alasan_penolakan,
                )
                .map((entry) => (
                  <p key={entry.id} className="mt-2 border-t border-[#f1c7ce] pt-2">
                    Riwayat {formatWaktu(entry.waktu)} oleh{" "}
                    <span className="font-semibold">{entry.panitia.nama}</span>
                    : {entry.alasan_penolakan}
                  </p>
                ))}
            </div>
          )}
          <Link
            href={backHref}
            className="mt-3 inline-block text-xs font-semibold text-[#3d7563] hover:underline"
          >
            ← Kembali ke {readOnly ? "Pemenang" : kategoriJudul}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[820px]">
      <Link
        href={backHref}
        className="text-xs font-semibold text-[#3d7563] hover:underline"
      >
        ← Kembali ke{" "}
        {readOnly
          ? readOnlySource === "pemenang"
            ? "Pemenang"
            : "Kandidat Pemenang"
          : kategoriJudul}
      </Link>

      <header className="mb-5 mt-5">
        <p className="text-xs font-medium text-[#84918b]">
          {role === "juri" && readOnly
            ? "Hasil Penetapan"
            : `Tinjauan ${role === "panitia" ? "Panitia" : "Juri"}`}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-[#24453b]">
          {item.peserta.nama}
        </h1>
        <p className="mt-1 text-sm text-[#84918b]">{kategoriJudul}</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-[#dce5e0] bg-white shadow-[0_2px_8px_rgba(27,61,49,0.06)]">
        <div className="h-1.5 bg-gradient-to-r from-[#00a477] via-[#14c9a7] to-[#f0b52c]" />
        <div className="p-5 sm:p-6">
          <dl className="grid gap-x-8 gap-y-5 border-b border-[#e8eeea] pb-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#84918b]">Peserta</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {item.peserta.nama}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Asal sekolah / kampus</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {item.peserta.asal}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Tanggal mendaftar</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {formatTanggal(item.peserta.tanggalDaftar)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Status saat ini</dt>
              <dd className="mt-1">
                {statusStyle && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                    {getStatusLabel(status)}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <div className="pt-5">
            <h2 className="text-sm font-bold text-[#29463d]">
              Berkas untuk ditinjau
            </h2>
            {visibleFiles.some((file) => file.isDemo) && (
              <p className="mt-1 text-xs text-[#a75c20]">
                Berkas demo yang sama ditampilkan untuk setiap peserta.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {visibleFiles.map((file) => (
                <details
                  key={`${file.jenis}-${file.href}`}
                  className="overflow-hidden rounded-lg border border-[#d6e0da]"
                  onToggle={(event) => {
                    const fileKey = `${file.jenis}-${file.href}`;
                    const isOpen = event.currentTarget.open;
                    setOpenFilePreviews((current) => {
                      const next = new Set(current);
                      if (isOpen) {
                        next.add(fileKey);
                      } else {
                        next.delete(fileKey);
                      }
                      return next;
                    });
                  }}
                >
                  <summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[#345248]">
                    {file.label}
                  </summary>
                  {openFilePreviews.has(`${file.jenis}-${file.href}`) && (
                    <div className="border-t border-[#e8eeea] p-3">
                      <div className="mb-2 text-right">
                        <a
                          href={file.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#3d7563] underline"
                        >
                          Buka PDF di tab baru
                        </a>
                      </div>
                      <iframe
                        title={file.label}
                        src={file.href}
                        loading="lazy"
                        className="h-[min(75vh,760px)] w-full rounded-md border border-[#e8eeea] bg-[#f7f8f7]"
                      />
                    </div>
                  )}
                </details>
              ))}
            </div>
          </div>

          {role === "panitia" && !readOnly && (
            <div className="mt-5 border-t border-[#e8eeea] pt-5">
              <h2 className="text-sm font-bold text-[#29463d]">
                Keputusan tinjauan
              </h2>
              <p className="mt-1 text-xs text-[#84918b]">
                Saat karya dibuka untuk ditinjau, status Menunggu otomatis
                menjadi Diproses.
              </p>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor={`decision-${item.karya.id}`}>
                  Pilih status hasil tinjauan
                </label>
                <select
                  id={`decision-${item.karya.id}`}
                  value={draftStatus}
                  onChange={(event) => {
                    const nextStatus = event.target.value as StatusKarya;
                    if (nextStatus === "ditolak" && draftStatus !== "ditolak") {
                      setRejectionReason("");
                    }
                    setDraftStatus(nextStatus);
                    setSaved(false);
                  }}
                  className="h-10 w-full rounded-lg border border-[#e0b349] bg-[#fffaf0] px-3 text-xs font-semibold text-[#85520d] outline-none focus:ring-2 focus:ring-[#f0c458]/30 sm:max-w-[350px]"
                >
                  {STATUS_KARYA.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getStatusLabel(option.value)}
                    </option>
                  ))}
                </select>
                {draftStatus === "ditolak" && (
                  <label className="w-full text-xs font-semibold text-[#8b3443] sm:max-w-[350px]">
                    Alasan penolakan (wajib)
                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      maxLength={1000}
                      rows={3}
                      required
                      className="mt-2 w-full rounded-md border border-[#e4c4c9] bg-white px-3 py-2 text-xs font-normal text-[#354a42] outline-none focus:border-[#b85b6b] focus:ring-2 focus:ring-[#b85b6b]/15"
                      placeholder="Jelaskan alasan karya ditolak..."
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => void saveDecision()}
                  className="rounded-lg bg-[#245c4f] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#19483e]"
                >
                  Simpan keputusan
                </button>
              </div>
              {saved && (
                <p role="status" className="mt-3 text-xs font-medium text-[#1f6746]">
                  Status dan riwayat berhasil disimpan di Supabase.
                </p>
              )}
              {actionError && (
                <p role="alert" className="mt-3 text-xs font-medium text-[#a33340]">
                  {actionError}
                </p>
              )}
            </div>
          )}

          {(role === "panitia" || history.length > 0) && (
            <section className="mt-5 border-t border-[#e8eeea] pt-5">
              <details className="overflow-hidden rounded-lg border border-[#d6e0da]">
                <summary className="cursor-pointer px-3 py-3 text-sm font-bold text-[#29463d]">
                  Riwayat perubahan status
                  <span className="ml-2 text-xs font-medium text-[#84918b]">
                    ({panitiaHistory.length})
                  </span>
                </summary>
                <div className="max-h-80 overflow-y-auto overscroll-contain border-t border-[#e8eeea] p-3">
                  {panitiaHistory.length === 0 ? (
                    <p className="text-xs text-[#84918b]">
                      Belum ada perubahan status yang tercatat.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {panitiaHistory.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-md bg-[#f7faf8] px-3 py-2 text-xs text-[#52766a]"
                        >
                          <span className="font-semibold">
                            {entry.panitia.nama}
                          </span>{" "}
                          mengubah status dari{" "}
                          <span className="font-semibold">
                            {getStatusLabel(entry.status_lama)}
                          </span>{" "}
                          menjadi{" "}
                          <span className="font-semibold">
                            {getStatusLabel(entry.status_baru)}
                          </span>
                          {entry.status_baru === "ditolak" &&
                            entry.alasan_penolakan && (
                              <p className="mt-1">
                                Alasan: {entry.alasan_penolakan}
                              </p>
                            )}
                          <time
                            className="mt-1 block text-[11px] text-[#84918b]"
                            dateTime={entry.waktu}
                          >
                            {formatWaktu(entry.waktu)}
                          </time>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>
            </section>
          )}

          {role === "panitia" && status === "diverifikasi" && (
            <section className="mt-5 border-t border-[#e8eeea] pt-5">
              <h2 className="text-sm font-bold text-[#29463d]">
                Tinjauan juri
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {juriKategori.map((juri) => {
                  const reviewStatus = getReviewStatus(juri.id);
                  return (
                    <li
                      key={juri.id}
                      className="rounded-md bg-[#f7faf8] px-3 py-2 text-[11px] text-[#52766a]"
                    >
                      {juri.nama}:{" "}
                      {reviewStatus === "sudah"
                        ? "Sudah ditinjau"
                        : reviewStatus === "sedang"
                          ? "Sedang ditinjau"
                          : "Belum ditinjau"}
                    </li>
                  );
                })}
              </ul>
              {juriPemilih.length > 0 && (
                <p className="mt-3 text-xs text-[#52766a]">
                  Dipilih sebagai kandidat oleh{" "}
                  {juriPemilih.map((juri) => juri.nama).join(", ")}.
                </p>
              )}
            </section>
          )}

          {role === "juri" && readOnly ? (
            <section className="mt-5 border-t border-[#e8eeea] pt-5">
              <h2 className="text-sm font-bold text-[#29463d]">
                Ringkasan penetapan
              </h2>
              {peringkatSaatIni ? (
                <div className="mt-3 rounded-lg border border-[#f0dfb8] bg-[#fffaf0] p-3">
                  <span className="inline-flex rounded-full bg-[#fff0c7] px-2.5 py-1 text-xs font-semibold text-[#946914]">
                    Peringkat {peringkatSaatIni.peringkat}
                  </span>
                  <p className="mt-2 text-xs text-[#718079]">
                    Ditetapkan oleh {peringkatSaatIni.ditetapkanOlehNama} pada{" "}
                    {formatTanggal(peringkatSaatIni.ditetapkanPada.slice(0, 10))}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#84918b]">
                  Belum ditetapkan.
                </p>
              )}
              {juriPemilih.length > 0 && (
                <p className="mt-3 text-xs text-[#52766a]">
                  Dipilih oleh {juriPemilih.map((juri) => juri.nama).join(", ")}.
                </p>
              )}
            </section>
          ) : role === "juri" ? (
            <section className="mt-5 border-t border-[#e8eeea] pt-5">
              <h2 className="text-sm font-bold text-[#29463d]">
                Penandaan juri
              </h2>
              <p className="mt-1 text-xs text-[#84918b]">
                Setiap juri memiliki penanda tinjauan masing-masing.
              </p>
              <ul className="mt-3 space-y-2">
                {juriKategori.map((juri) => {
                  const reviewStatus = getReviewStatus(juri.id);
                  const waktu = getReviewTime(juri.id);
                  const waktuStatus =
                    reviewStatus === "sudah"
                      ? waktu?.selesaiPada
                      : reviewStatus === "sedang"
                        ? waktu?.terakhirAktif
                        : null;
                  return (
                    <li
                      key={juri.id}
                      className={`rounded-lg border px-3 py-3 text-xs ${
                        juri.id === juriAktif?.id
                          ? "border-[#9cc8b4] bg-[#f0f8f3]"
                          : "border-[#e2e9e5] bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#345248]">
                          {juri.nama}
                          {juri.id === juriAktif?.id ? " (Anda)" : ""}
                        </span>
                        <span className="text-[#52766a]">
                          {reviewStatus === "sudah"
                            ? "Sudah ditinjau"
                            : reviewStatus === "sedang"
                              ? "Sedang ditinjau"
                              : "Belum ditinjau"}
                        </span>
                      </div>
                      {waktuStatus && (
                        <p className="mt-1 text-[11px] text-[#84918b]">
                          {reviewStatus === "sudah"
                            ? "Selesai"
                            : "Aktif terakhir"}{" "}
                          {formatTanggal(waktuStatus.slice(0, 10))} pukul{" "}
                          {new Date(waktuStatus).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                aria-pressed={statusAktif === "sudah"}
                onClick={() => void toggleSudahDitinjau()}
                className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold transition ${
                  statusAktif === "sudah"
                    ? "border-[#9cc8b4] bg-[#eafbf4] text-[#24724f]"
                    : "border-[#dfe6e2] bg-white text-[#345248] hover:bg-[#f5faf7]"
                }`}
              >
                <span aria-hidden="true">✓</span>
                {statusAktif === "sudah"
                  ? "Batalkan tanda sudah ditinjau"
                  : "Tandai sudah ditinjau"}
              </button>

              {dipilihJuriLain.length > 0 && (
                <p className="mt-3 rounded-md bg-[#f7faf8] px-3 py-2 text-xs text-[#52766a]">
                  Sudah dipilih {dipilihJuriLain.map((juri) => juri.nama).join(", ")}; pilihanmu tidak memakai kuota tambahan.
                </p>
              )}

              <div className="mt-3">
                {confirmCancelCandidate ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#f0d7b8] bg-[#fffaf2] p-3">
                    <span className="mr-1 text-xs text-[#755527]">
                      {peringkatAkanHilang === null
                        ? "Batalkan pilihan kandidat?"
                        : `${item.peserta.nama} sedang di peringkat ${peringkatAkanHilang}. Membatalkan pilihan ini juga menghapus peringkatnya.`}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleKandidat()}
                      className="rounded-md bg-[#9e5337] px-3 py-2 text-xs font-semibold text-white hover:bg-[#84432d]"
                    >
                      {peringkatAkanHilang === null
                        ? "Ya, batalkan"
                        : "Ya, batalkan pilihan dan hapus peringkat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelCandidate(false)}
                      className="rounded-md border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#52675f]"
                    >
                      Jangan batalkan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleKandidat()}
                    disabled={
                      !sudahDipilihAktif &&
                      (statusAktif !== "sudah" ||
                        (kuotaPenuh && !sudahKandidat))
                    }
                    className="rounded-lg bg-[#245c4f] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#19483e] disabled:cursor-not-allowed disabled:bg-[#dfe6e2] disabled:text-[#84918b]"
                  >
                    {sudahDipilihAktif
                      ? "Batalkan kandidat"
                      : "Jadikan kandidat"}
                  </button>
                )}
              </div>
              {!sudahDipilihAktif && statusAktif !== "sudah" && (
                <p className="mt-2 text-xs text-[#84918b]">
                  Tandai sudah ditinjau terlebih dahulu
                </p>
              )}
              {!sudahDipilihAktif &&
                statusAktif === "sudah" &&
                kuotaPenuh &&
                !sudahKandidat && (
                  <p className="mt-2 text-xs text-[#a75c20]">
                    Kuota kandidat penuh
                  </p>
                )}
              {(trackingError || actionError) && (
                <p role="alert" className="mt-3 text-xs font-medium text-[#a33340]">
                  {trackingError || actionError}
                </p>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
