"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATURAN_LOMBA } from "@/lib/aturan-lomba";
import type { KandidatContoh } from "@/lib/data-contoh";
import { useStatusKarya } from "@/lib/review-status";
import { getStatusLabel, getStatusStyle } from "@/lib/status";
import type { KategoriLomba } from "@/types/karya";

type KandidatKategoriProps = {
  kategori: KategoriLomba;
  items: KandidatContoh[];
};

function getInisial(nama: string): string {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian[0])
    .join("")
    .toLocaleUpperCase("id-ID");
}

export default function KandidatKategori({
  kategori,
  items,
}: KandidatKategoriProps) {
  const [query, setQuery] = useState("");
  const judulKategori =
    kategori === "cerita" ? "Cerita HAM" : "Komik Bergambar";
  const aturan = ATURAN_LOMBA[kategori];
  const karya = useMemo(() => items.map((item) => item.karya), [items]);
  const { statuses, error } = useStatusKarya(karya);
  const kandidat = useMemo(
    () =>
      items
        .filter(
          ({ karya, peserta }) =>
            karya.tahap === "kandidat" &&
            (statuses[karya.id] ?? karya.status) === "diverifikasi" &&
            peserta.kategori === kategori,
        )
        .sort(
          (first, second) =>
            new Date(first.karya.ditandaiPada).getTime() -
            new Date(second.karya.ditandaiPada).getTime(),
        )
        .slice(0, aturan.batasKandidat),
    [aturan.batasKandidat, items, kategori, statuses],
  );
  const kandidatTerfilter = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("id-ID");
    if (!searchTerm) {
      return kandidat;
    }
    return kandidat.filter(
      ({ peserta }) =>
        peserta.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
        peserta.asal.toLocaleLowerCase("id-ID").includes(searchTerm),
    );
  }, [kandidat, query]);
  const kuotaPenuh = kandidat.length >= aturan.batasKandidat;

  return (
    <main className="mx-auto max-w-[920px]">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
          {error}
        </p>
      )}
      <section className="mb-4 rounded-xl border border-[#dce5e0] bg-white px-5 py-7 text-center shadow-[0_2px_8px_rgba(27,61,49,0.06)] sm:py-8">
        <svg
          aria-hidden="true"
          viewBox="0 0 96 88"
          fill="none"
          className="mx-auto mb-2 h-20 w-24"
        >
          <path
            d="M25 25H71V43C71 58 61 68 48 68S25 58 25 43V25Z"
            fill="#fff3d4"
            stroke="#75847d"
            strokeWidth="2"
          />
          <path
            d="M25 31H18C13 31 10 35 11 41C12 48 18 52 27 52M71 31H78C83 31 86 35 85 41C84 48 78 52 69 52"
            stroke="#75847d"
            strokeWidth="2"
          />
          <path d="M48 68V75M36 78H60" stroke="#75847d" strokeWidth="2" />
          <path d="M48 7V14M19 18L24 23M77 18L72 23" stroke="#9aa49f" strokeWidth="2" />
        </svg>
        <h1 className="text-[22px] font-bold tracking-tight text-[#24453b]">
          Kandidat Pemenang
        </h1>
        <p className="mx-auto mt-1 max-w-[440px] text-xs text-[#84918b]">
          Karya yang dipilih juri sebagai kandidat pemenang.
        </p>
      </section>

      <section className="rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.06)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#29463d]">
              Kandidat {judulKategori}
            </h2>
            <p className="mt-1 text-xs text-[#84918b]">
              Karya yang sudah diverifikasi dan dipilih juri.
            </p>
          </div>
          <label className="sr-only" htmlFor="candidate-search">
            Cari nama atau asal peserta
          </label>
          <input
            id="candidate-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau asal peserta"
            className="h-10 w-full rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15 sm:max-w-[280px]"
          />
        </div>

        <p className="mt-4 text-xs text-[#718079]">
          {kandidat.length} dari {aturan.batasKandidat} kandidat
        </p>
        {kuotaPenuh && (
          <p className="mt-1 text-[11px] text-[#84918b]">
            Kuota kandidat penuh
          </p>
        )}

        {kandidat.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
            Belum ada kandidat
          </p>
        ) : kandidatTerfilter.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
            Tidak ada kandidat yang cocok
          </p>
        ) : (
          <ol className="mt-3 space-y-2" aria-label={`Kandidat ${judulKategori}`}>
            {kandidatTerfilter.map(({ karya: karyaKandidat, peserta }, index) => {
              const status =
                statuses[karyaKandidat.id] ?? karyaKandidat.status;
              const statusStyle = getStatusStyle(status);
              const detailKandidatHref = `/panitia/karya/${karyaKandidat.id}?dari=kandidat&kategori=${kategori}`;

              return (
                <li
                  key={karyaKandidat.id}
                  className="flex items-center gap-3 rounded-lg border border-[#e3eae6] bg-white p-3"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-[#64716c]">
                    {index + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eaf4ef] text-[10px] font-bold text-[#356454]"
                  >
                    {getInisial(peserta.nama)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[#345248]">
                      {peserta.nama}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#89958f]">
                      {peserta.asal}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {karyaKandidat.dipilihOleh.length > 0 && (
                        <span className="text-[10px] text-[#718079]">
                          Dipilih oleh {karyaKandidat.dipilihOleh.length} juri
                        </span>
                      )}
                      {statusStyle && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyle.badgeClass}`}
                        >
                          <span
                            aria-hidden="true"
                            className="mr-1 mt-0.5 size-1.5 rounded-full"
                            style={{ backgroundColor: statusStyle.color }}
                          />
                          {getStatusLabel(status)}
                        </span>
                      )}
                    </span>
                  </span>
                  <Link
                    href={detailKandidatHref}
                    className="shrink-0 rounded-lg bg-[#245c4f] px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#19483e]"
                  >
                    Lihat karya
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
