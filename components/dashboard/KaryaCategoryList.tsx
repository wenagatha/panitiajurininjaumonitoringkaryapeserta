"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStatusLabel, getStatusStyle, STATUS_KARYA } from "@/lib/status";
import type { BerkasKarya } from "@/lib/berkas-demo";
import { useStatusKarya } from "@/lib/review-status";
import type {
  Karya,
  KategoriLomba,
  Peserta,
  StatusKarya,
} from "@/types/karya";

export type KaryaDaftarItem = {
  karya: Karya;
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
};

export function filterKaryaUntukRole(
  items: KaryaDaftarItem[],
  role: "panitia" | "juri",
  statuses: Record<string, StatusKarya>,
): KaryaDaftarItem[] {
  if (role === "panitia") {
    return items;
  }
  // TODO: nantinya penjagaan status terverifikasi juga dilakukan oleh RLS Supabase.
  return items.filter(
    ({ karya }) => (statuses[karya.id] ?? karya.status) === "diverifikasi",
  );
}

function formatTanggal(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KaryaCategoryList({
  kategori,
  items,
  role = "panitia",
}: KaryaCategoryListProps) {
  const router = useRouter();
  const karya = useMemo(() => items.map((item) => item.karya), [items]);
  const { statuses, setStatus, error } = useStatusKarya(karya);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | StatusKarya>(
    "semua",
  );

  const roleItems = useMemo(
    () => filterKaryaUntukRole(items, role, statuses),
    [items, role, statuses],
  );
  const visibleItems = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("id-ID");
    return roleItems.filter(({ karya: work, peserta }) => {
      const currentStatus = statuses[work.id] ?? work.status;
      const matchesSearch =
        !searchTerm ||
        peserta.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
        peserta.asal.toLocaleLowerCase("id-ID").includes(searchTerm);
      return (
        matchesSearch &&
        (role === "juri" ||
          filterStatus === "semua" ||
          currentStatus === filterStatus)
      );
    });
  }, [filterStatus, query, role, roleItems, statuses]);

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

  function openReview(item: KaryaDaftarItem) {
    const currentStatus = statuses[item.karya.id] ?? item.karya.status;
    if (currentStatus === "menunggu" && !setStatus(item.karya.id, "diproses")) {
      return;
    }
    router.push(
      `/panitia/karya/${item.karya.id}?kategori=${kategori}`,
    );
  }

  function markCandidate() {
    // TODO: sambungkan aksi ini ke alur kandidat juri.
  }

  const kategoriJudul =
    kategori === "cerita" ? "Cerita HAM" : "Lomba Komik Bergambar";
  const labelKarya = kategori === "cerita" ? "BUKU CERITA" : "KOMIK BERGAMBAR";
  const hasDemoFiles = visibleItems.some((item) =>
    item.berkas.some((file) => file.isDemo),
  );
  const statusCards = [
    { key: "total", label: "Total data karya", color: "#00a477" },
    { key: "menunggu", label: "Menunggu", color: "#5596e8" },
    { key: "diproses", label: "Ditinjau", color: "#f39a00" },
    { key: "diverifikasi", label: "Diverifikasi", color: "#00a477" },
    { key: "ditolak", label: "Ditolak", color: "#f04773" },
  ] as const;

  return (
    <main>
      <header className="mb-5">
        <p className="text-xs font-medium text-[#84918b]">
          Monitoring &amp; Meninjau
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#24453b]">
          Daftar Karya {kategoriJudul}
        </h1>
        <p className="mt-1 text-xs text-[#84918b]">
          Pantau karya, berkas, dan status peninjauan lomba {kategoriJudul}.
        </p>
      </header>

      {hasDemoFiles && (
        <p className="mb-4 rounded-lg border border-[#f1d27b] bg-[#fffbed] px-3 py-2 text-xs text-[#985216]">
          Berkas yang sama ditampilkan untuk semua peserta sebagai data demo;
          dokumen ini bukan unggahan asli masing-masing peserta.
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statusCards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-[#dce5e0] border-t-[3px] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.035)]"
            style={{ borderTopColor: card.color }}
          >
            <p className="text-xs text-[#84918b]">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-[#24453b]">
              {counts[card.key]}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#f0a000] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#29463d]">
              Data karya {kategoriJudul}
            </h2>
            <p className="mt-1 text-xs text-[#84918b]">
              Cari peserta{role === "panitia" ? " atau saring berdasarkan status" : ""}.
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
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
            {error}
          </p>
        )}

        <ul className="mt-5 space-y-3">
          {visibleItems.map((item) => {
            const status = statuses[item.karya.id] ?? item.karya.status;
            const statusStyle = getStatusStyle(status);
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
                      {role === "panitia" ? (
                        <>
                          <label className="sr-only" htmlFor={`status-${item.karya.id}`}>
                            Status karya {item.peserta.nama}
                          </label>
                          <select
                            id={`status-${item.karya.id}`}
                            value={status}
                            onChange={(event) =>
                              setStatus(
                                item.karya.id,
                                event.target.value as StatusKarya,
                              )
                            }
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
                            onClick={() => openReview(item)}
                            className="rounded-lg bg-[#245c4f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#19483e]"
                          >
                            Tinjau
                          </button>
                        </>
                      ) : (
                        <>
                          {statusStyle && (
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                              {getStatusLabel(status)}
                            </span>
                          )}
                          <button
                            type="button"
                            disabled
                            onClick={markCandidate}
                            className="rounded-lg border border-[#dfe6e2] px-4 py-2 text-xs font-semibold text-[#718079] disabled:cursor-not-allowed"
                          >
                            Jadikan kandidat
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <dl className="grid gap-3 py-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-[#84918b]">Peserta</dt>
                      <dd className="mt-0.5 font-medium text-[#345248]">{item.peserta.nama}</dd>
                    </div>
                    <div>
                      <dt className="text-[#84918b]">Asal</dt>
                      <dd className="mt-0.5 font-medium text-[#345248]">{item.peserta.asal}</dd>
                    </div>
                    <div>
                      <dt className="text-[#84918b]">Tanggal mendaftar</dt>
                      <dd className="mt-0.5 font-medium text-[#345248]">
                        {formatTanggal(item.peserta.tanggalDaftar)}
                      </dd>
                    </div>
                  </dl>

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
