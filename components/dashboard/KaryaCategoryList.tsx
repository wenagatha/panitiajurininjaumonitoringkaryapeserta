"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStatusLabel, getStatusStyle, STATUS_KARYA } from "@/lib/status";
import type { BerkasKarya } from "@/lib/berkas-demo";
import {
  updatePanitiaKaryaStatus,
  type PanitiaRiwayatStatus,
} from "@/lib/panitia-actions";
import { ATURAN_LOMBA, HEARTBEAT_DETIK } from "@/lib/aturan-lomba";
import { useJuriAktif } from "@/components/juri/JuriAktifProvider";
import { useDetakWaktu } from "@/lib/use-detak-waktu";
import type { JuriWorkflowSnapshot } from "@/lib/juri-workflow";
import type {
  Karya,
  KategoriLomba,
  Peserta,
  StatusKarya,
} from "@/types/karya";

export type KaryaDaftarItem = {
  karya: Pick<
    Karya,
    "id" | "pesertaId" | "status" | "urlKarya" | "urlPernyataan"
  >;
  peserta: Pick<
    Peserta,
    "id" | "nama" | "asal" | "kategori" | "tanggalDaftar"
  >;
  berkas: BerkasKarya[];
};

type KaryaCategoryListProps = {
  kategori: KategoriLomba;
  items: KaryaDaftarItem[];
  role?: "panitia" | "juri";
  historyByKarya?: Record<string, PanitiaRiwayatStatus[]>;
  workflow?: JuriWorkflowSnapshot;
};

export function filterKaryaUntukRole(
  items: KaryaDaftarItem[],
  role: "panitia" | "juri",
  statuses: Record<string, StatusKarya>,
  kategori?: KategoriLomba,
): KaryaDaftarItem[] {
  if (role === "panitia") {
    return items;
  }
  return items.filter(
    ({ karya, peserta }) =>
      (statuses[karya.id] ?? karya.status) === "diverifikasi" &&
      (!kategori || peserta.kategori === kategori),
  );
}

function formatTanggal(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(waktu: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(waktu));
}

export default function KaryaCategoryList({
  kategori,
  items,
  role = "panitia",
  historyByKarya,
  workflow,
}: KaryaCategoryListProps) {
  if (role === "juri") {
    return (
      <KaryaCategoryListJuri
        kategori={kategori}
        items={items}
        workflow={workflow}
      />
    );
  }
  return (
    <KaryaCategoryListContent
      kategori={kategori}
      items={items}
      role="panitia"
      historyByKarya={historyByKarya}
    />
  );
}

function KaryaCategoryListJuri({
  kategori,
  items,
  workflow,
}: Omit<KaryaCategoryListProps, "role">) {
  const juriAktif = useJuriAktif();
  return (
    <KaryaCategoryListContent
      kategori={kategori}
      items={items}
      role="juri"
      juriAktif={juriAktif}
      workflow={workflow}
    />
  );
}

function KaryaCategoryListContent({
  kategori,
  items,
  role,
  juriAktif,
  historyByKarya,
  workflow,
}: Omit<KaryaCategoryListProps, "role"> & {
  role: "panitia" | "juri";
  juriAktif?: ReturnType<typeof useJuriAktif>;
  workflow?: JuriWorkflowSnapshot;
}) {
  const router = useRouter();
  const now = useDetakWaktu(30_000);
  const workflowData = workflow ?? {
    judges: [],
    selections: [],
    ranks: [],
    history: [],
    reviews: [],
  };
  const [panitiaStatuses, setPanitiaStatuses] = useState<
    Record<string, StatusKarya>
  >(() =>
    Object.fromEntries(items.map(({ karya: work }) => [work.id, work.status])),
  );
  const [panitiaError, setPanitiaError] = useState("");
  const [savingKaryaId, setSavingKaryaId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusKarya>(
    "semua",
  );
  const [filterTinjauan, setFilterTinjauan] = useState<
    "semua" | "belum" | "sudah"
  >("semua");

  useEffect(() => {
    if (role !== "juri") {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, HEARTBEAT_DETIK * 1000);
    return () => window.clearInterval(intervalId);
  }, [role, router]);

  const statuses =
    role === "panitia"
      ? panitiaStatuses
      : Object.fromEntries(
          items.map(({ karya: work }) => [work.id, work.status]),
        );
  const roleItems = useMemo(
    () => filterKaryaUntukRole(items, role, statuses, juriAktif?.kategori),
    [items, juriAktif?.kategori, role, statuses],
  );
  const searchTerm = query.trim().toLocaleLowerCase("id-ID");
  const visibleItems = roleItems.filter(({ karya: work, peserta }) => {
    const currentStatus = statuses[work.id] ?? work.status;
    const matchesSearch =
      !searchTerm ||
      peserta.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
      peserta.asal.toLocaleLowerCase("id-ID").includes(searchTerm);
    const reviewStatus = getReviewStatus(work.id, juriAktif?.id ?? "");
    const matchesJuriReview =
      role !== "juri" ||
      filterTinjauan === "semua" ||
      (filterTinjauan === "sudah"
        ? reviewStatus === "sudah"
        : reviewStatus !== "sudah");
    return (
      matchesSearch &&
      matchesJuriReview &&
      (role === "juri" ||
        filterStatus === "semua" ||
        currentStatus === filterStatus)
    );
  });

  const counts = useMemo(() => {
    const result: Record<"total" | StatusKarya, number> = {
      total: roleItems.length,
      menunggu: 0,
      diproses: 0,
      diverifikasi: 0,
      ditolak: 0,
    };
    for (const { karya: work } of roleItems) {
      result[statuses[work.id] ?? work.status] += 1;
    }
    return result;
  }, [roleItems, statuses]);

  function getReviewStatus(workId: string, judgeId: string) {
    const review = workflowData.reviews.find(
      (entry) => entry.karyaId === workId && entry.juriId === judgeId,
    );
    if (!review) {
      return "belum";
    }
    if (
      review.status === "sedang" &&
      now - Date.parse(review.terakhirAktif) > 5 * 60_000
    ) {
      return "belum";
    }
    return review.status;
  }

  async function saveStatus(id: string, status: StatusKarya) {
    setPanitiaError("");
    setSavingKaryaId(id);
    try {
      await updatePanitiaKaryaStatus(id, status);
      setPanitiaStatuses((previous) => ({ ...previous, [id]: status }));
      router.refresh();
      return true;
    } catch (cause) {
      setPanitiaError(
        cause instanceof Error ? cause.message : "Status karya gagal disimpan.",
      );
      return false;
    } finally {
      setSavingKaryaId(null);
    }
  }

  async function openReview(item: KaryaDaftarItem) {
    if (role === "juri") {
      router.push(`/juri/karya/${item.karya.id}`);
      return;
    }
    const currentStatus = statuses[item.karya.id] ?? item.karya.status;
    if (
      currentStatus === "menunggu" &&
      !(await saveStatus(item.karya.id, "diproses"))
    ) {
      return;
    }
    router.push(`/panitia/karya/${item.karya.id}?kategori=${kategori}`);
  }

  const kategoriJudul =
    kategori === "cerita"
      ? "Cerita HAM"
      : role === "juri"
        ? "Komik Bergambar"
        : "Lomba Komik Bergambar";
  const labelKarya = kategori === "cerita" ? "BUKU CERITA" : "KOMIK BERGAMBAR";
  const hasDemoFiles = role === "panitia" && visibleItems.some((item) =>
    item.berkas.some((file) => file.isDemo),
  );
  const juriReviewCounts = roleItems.reduce(
    (result, { karya: work }) => {
      if (
        juriAktif &&
        getReviewStatus(work.id, juriAktif.id) === "sudah"
      ) {
        result.sudah += 1;
      } else {
        result.belum += 1;
      }
      return result;
    },
    { belum: 0, sudah: 0 },
  );
  const kategoriJuri = juriAktif?.kategori ?? kategori;
  const candidateCount =
    role === "juri"
      ? new Set(workflowData.selections.map(({ karyaId }) => karyaId)).size
      : 0;
  const rankByWorkId = new Map(
    workflowData.ranks.map((rank) => [rank.karyaId, rank.peringkat]),
  );
  const statusCards =
    role === "juri"
      ? [
          { key: "total", label: "Total karya", value: counts.total, color: "#00a477" },
          { key: "belum", label: "Belum saya tinjau", value: juriReviewCounts.belum, color: "#5596e8" },
          { key: "sudah", label: "Sudah saya tinjau", value: juriReviewCounts.sudah, color: "#00a477" },
          {
            key: "kandidat",
            label: "Kandidat",
            value: `${candidateCount} dari ${ATURAN_LOMBA[kategoriJuri].batasKandidat}`,
            color: "#f0a000",
          },
        ]
      : [
          { key: "total", label: "Total data karya", value: counts.total, color: "#00a477" },
          { key: "menunggu", label: "Menunggu", value: counts.menunggu, color: "#5596e8" },
          { key: "diproses", label: "Ditinjau", value: counts.diproses, color: "#f39a00" },
          { key: "diverifikasi", label: "Diverifikasi", value: counts.diverifikasi, color: "#00a477" },
          { key: "ditolak", label: "Ditolak", value: counts.ditolak, color: "#f04773" },
        ];

  return (
    <main>
      <header className="mb-5">
        <p className="text-xs font-medium text-[#84918b]">
          {role === "juri" ? "Penilaian" : "Monitoring & Meninjau"}
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#24453b]">
          Daftar Karya {kategoriJudul}
        </h1>
        <p className="mt-1 text-xs text-[#84918b]">
          {role === "juri"
            ? `Tinjau karya terverifikasi untuk kategori ${kategoriJudul}.`
            : `Pantau karya, berkas, dan status peninjauan lomba ${kategoriJudul}.`}
        </p>
      </header>

      {hasDemoFiles && (
        <p className="mb-4 rounded-lg border border-[#f1d27b] bg-[#fffbed] px-3 py-2 text-xs text-[#985216]">
          Berkas yang sama ditampilkan untuk semua peserta sebagai data demo;
          dokumen ini bukan unggahan asli masing-masing peserta.
        </p>
      )}

      <div className={`mb-4 grid grid-cols-2 gap-3 ${role === "juri" ? "sm:grid-cols-4" : "sm:grid-cols-3 xl:grid-cols-5"}`}>
        {statusCards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-[#dce5e0] border-t-[3px] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.035)]"
            style={{ borderTopColor: card.color }}
          >
            <p className="text-xs text-[#84918b]">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-[#24453b]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#f0a000] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#29463d]">
              {role === "juri" ? `Karya ${kategoriJudul}` : `Data karya ${kategoriJudul}`}
            </h2>
            <p className="mt-1 text-xs text-[#84918b]">
              {role === "panitia"
                ? "Cari peserta atau saring berdasarkan status."
                : "Cari peserta atau saring berdasarkan tinjauan Anda."}
            </p>
          </div>
          <p className="text-xs text-[#84918b]">
            {visibleItems.length} data ditemukan
          </p>
        </div>

        <div
          className={`mt-3 grid gap-2 ${role === "panitia" ? "sm:grid-cols-2" : ""}`}
        >
          <label className="sr-only" htmlFor={`karya-search-${kategori}`}>
            Cari nama atau asal peserta
          </label>
          <input
            id={`karya-search-${kategori}`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau asal peserta"
            className="h-10 min-w-0 rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
          />
          {role === "panitia" && (
            <>
              <label className="sr-only" htmlFor={`status-filter-${kategori}`}>
                Filter status karya
              </label>
              <select
                id={`status-filter-${kategori}`}
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(event.target.value as "semua" | StatusKarya)
                }
                className="h-10 rounded-lg border border-[#dfe6e2] bg-white px-3 text-xs text-[#42564e] outline-none focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
              >
                <option value="semua">Semua status</option>
                {STATUS_KARYA.map((status) => (
                  <option key={status.value} value={status.value}>
                    {getStatusLabel(status.value)}
                  </option>
                ))}
              </select>
            </>
          )}
          {role === "juri" && (
            <select
              aria-label="Filter status tinjauan saya"
              value={filterTinjauan}
              onChange={(event) =>
                setFilterTinjauan(event.target.value as "semua" | "belum" | "sudah")
              }
              className="h-10 rounded-lg border border-[#dfe6e2] bg-white px-3 text-xs text-[#42564e] outline-none focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
            >
              <option value="semua">Semua</option>
              <option value="belum">Belum saya tinjau</option>
              <option value="sudah">Sudah saya tinjau</option>
            </select>
          )}
        </div>

        {panitiaError && (
            <p role="alert" className="mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
              {panitiaError}
          </p>
        )}

        <ul className="mt-5 space-y-3">
          {visibleItems.map((item) => {
            const status = statuses[item.karya.id] ?? item.karya.status;
            const statusStyle = getStatusStyle(status);
            const latestHistory = historyByKarya?.[item.karya.id]?.[0];
            const candidateJudges = workflowData.selections
              .filter((selection) => selection.karyaId === item.karya.id)
              .map((selection) => ({
                id: selection.juriId,
                nama:
                  workflowData.judges.find(
                    (judge) => judge.id === selection.juriId,
                  )?.nama ?? selection.juriNama,
              }));
            const selectedByActive = candidateJudges.some(
              (juri) => juri.id === juriAktif?.id,
            );
            const otherCandidateJudges = candidateJudges.filter(
              (juri) => juri.id !== juriAktif?.id,
            );
            const rank = rankByWorkId.get(item.karya.id);
            const visibleFiles =
              role === "juri"
                ? item.berkas.filter((file) => file.jenis === "karya")
                : item.berkas;
            return (
              <li
                key={item.karya.id}
                className="overflow-hidden rounded-lg border border-[#dce5e0] shadow-[0_1px_3px_rgba(27,61,49,0.08)]"
              >
                <div className="h-1.5 bg-gradient-to-r from-[#00a477] via-[#14c9a7] to-[#f0b52c]" />
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ee] pb-3">
                    <span className="text-[10px] font-medium tracking-wide text-[#718079]">
                      {labelKarya}
                    </span>
                    <div className="flex items-center gap-2">
                      {status === "diverifikasi" &&
                        role === "panitia" &&
                        candidateJudges.length > 0 && (
                          <span className="inline-flex w-fit rounded-full bg-[#eafbf4] px-2.5 py-1 text-xs font-semibold text-[#24724f]">
                            Kandidat
                          </span>
                        )}
                      {status === "diverifikasi" && role === "juri" && (
                        <>
                          {selectedByActive ? (
                            <span className="inline-flex w-fit rounded-full bg-[#eaf4ef] px-2.5 py-1 text-xs font-semibold text-[#28634d]">
                              Pilihan Anda
                            </span>
                          ) : otherCandidateJudges.length > 0 ? (
                            <span className="inline-flex w-fit rounded-full bg-[#f1f4f2] px-2.5 py-1 text-xs font-semibold text-[#64716c]">
                              Dipilih{" "}
                              {otherCandidateJudges
                                .map((juri) => juri.nama)
                                .join(", ")}
                            </span>
                          ) : null}
                          {rank !== undefined && (
                            <span className="inline-flex w-fit rounded-full bg-[#fff4d8] px-2.5 py-1 text-xs font-semibold text-[#946914]">
                              Peringkat {rank}
                            </span>
                          )}
                        </>
                      )}
                      {role === "panitia" ? (
                        <>
                          <label className="sr-only" htmlFor={`status-${item.karya.id}`}>
                            Status karya {item.peserta.nama}
                          </label>
                          <select
                            id={`status-${item.karya.id}`}
                            value={status}
                            disabled={savingKaryaId === item.karya.id}
                            onChange={(event) => {
                              void saveStatus(
                                item.karya.id,
                                event.target.value as StatusKarya,
                              );
                            }}
                            className={`h-8 rounded-full border border-[#f0c458] bg-[#fffaf0] px-3 text-xs font-semibold text-[#85520d] outline-none focus:ring-2 focus:ring-[#f0c458]/30 ${statusStyle?.badgeClass ?? ""}`}
                          >
                            {STATUS_KARYA.map((option) => (
                              <option key={option.value} value={option.value}>
                                {getStatusLabel(option.value)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void openReview(item)}
                            className="rounded-lg bg-[#245c4f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#19483e]"
                          >
                            Tinjau
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void openReview(item)}
                          className="rounded-lg bg-[#245c4f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#19483e]"
                        >
                          Tinjau
                        </button>
                      )}
                    </div>
                  </div>

                  <dl className={`grid gap-3 py-3 text-xs ${role === "panitia" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <div>
                      <dt className="text-[#84918b]">Peserta</dt>
                      <dd className="mt-0.5 font-medium text-[#345248]">{item.peserta.nama}</dd>
                    </div>
                    <div>
                      <dt className="text-[#84918b]">Asal</dt>
                      <dd className="mt-0.5 font-medium text-[#345248]">{item.peserta.asal}</dd>
                    </div>
                    {role === "panitia" && (
                      <div>
                        <dt className="text-[#84918b]">Tanggal mendaftar</dt>
                        <dd className="mt-0.5 font-medium text-[#345248]">
                          {formatTanggal(item.peserta.tanggalDaftar)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {role === "panitia" && latestHistory && (
                      <p className="mb-3 rounded-md bg-[#f7faf8] px-3 py-2 text-[11px] text-[#52766a]">
                        Perubahan terakhir oleh{" "}
                        <span className="font-semibold">
                          {latestHistory.panitia.nama}
                        </span>
                        : {getStatusLabel(
                          latestHistory.status_lama,
                        )}{" "}
                        menjadi{" "}
                        {getStatusLabel(
                          latestHistory.status_baru,
                        )}{" "}
                        pada {formatWaktu(latestHistory.waktu)}
                      </p>
                    )}

                  {(role === "juri" || status === "diverifikasi") && (
                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                      {workflowData.judges.map((juri) => {
                        const review = getReviewStatus(
                          item.karya.id,
                          juri.id,
                        );
                        return (
                          <p
                            key={juri.id}
                            className="rounded-md bg-[#f7faf8] px-3 py-2 text-[11px] text-[#52766a]"
                          >
                            {juri.nama}:{" "}
                            {review === "sudah"
                              ? "Sudah ditinjau"
                              : review === "sedang"
                                ? "Sedang ditinjau"
                                : "Belum ditinjau"}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  {role === "panitia" && (
                    <div className="rounded-md border-l-[3px] border-[#00b78b] bg-[#eafbf4] px-3 py-2 text-xs text-[#52766a]">
                      Berkas demo tersedia untuk ditinjau.
                    </div>
                  )}
                  <h3 className="mt-3 text-xs font-bold text-[#345248]">
                    Berkas peserta
                  </h3>
                  <ul className="mt-2 grid gap-2 lg:grid-cols-3">
                    {visibleFiles.map((file) => (
                      <li key={`${file.jenis}-${file.href}`}>
                        <a
                          href={file.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-9 items-center justify-between gap-2 rounded-lg border border-[#d6e0da] px-3 py-2 text-xs font-medium text-[#345248] hover:bg-[#f5faf7]"
                        >
                          <span className="truncate">{file.label}</span>
                          <span className="shrink-0 rounded-full bg-[#ffe6ea] px-2 py-0.5 text-[9px] font-bold text-[#ac4154]">
                            PDF
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
          {visibleItems.length === 0 && (
            <li className="py-10 text-center text-xs text-[#87938e]">
              Tidak ada karya yang cocok.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
