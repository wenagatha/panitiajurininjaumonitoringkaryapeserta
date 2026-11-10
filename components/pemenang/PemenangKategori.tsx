"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATURAN_LOMBA } from "@/lib/aturan-lomba";
import { formatTanggal } from "@/lib/format-tanggal";
import { useStatusKarya } from "@/lib/review-status";
import {
  getKandidatKategori,
  getPeringkatKategori,
  useStateJuri,
} from "@/lib/state-juri";
import type { KategoriLomba, StatusKarya } from "@/types/karya";

type PemenangKategoriItem = {
  karya: { id: string; status: StatusKarya };
  id: string;
  nama: string;
  asal: string;
  kategori: KategoriLomba;
};

type PemenangKategoriProps = {
  kategori: KategoriLomba;
  items: PemenangKategoriItem[];
  role?: "panitia" | "juri";
};

const MEDAL_STYLES = [
  {
    border: "border-[#c3ccc8]",
    badge: "border-[#aab5b0] bg-[#f0f3f2] text-[#62716a]",
    ribbon: "text-[#9aa7a1]",
  },
  {
    border: "border-[#83a895]",
    badge: "border-[#d3a547] bg-[#fff4d8] text-[#946914]",
    ribbon: "text-[#d3a547]",
  },
  {
    border: "border-[#d5a77f]",
    badge: "border-[#b77745] bg-[#fff0e2] text-[#9c582e]",
    ribbon: "text-[#b77745]",
  },
];

function getInisial(nama: string): string {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian[0])
    .join("")
    .toLocaleUpperCase("id-ID");
}

function getDetailKaryaHref(
  karyaId: string,
  kategori: KategoriLomba,
  role: "panitia" | "juri",
): string {
  return role === "juri"
    ? `/juri/karya/${karyaId}?dari=pemenang`
    : `/panitia/karya/${karyaId}?dari=pemenang&kategori=${kategori}`;
}

export default function PemenangKategori({
  kategori,
  items,
  role = "panitia",
}: PemenangKategoriProps) {
  const [query, setQuery] = useState("");
  const judulKategori =
    kategori === "cerita" ? "Cerita HAM" : "Komik Bergambar";
  const aturan = ATURAN_LOMBA[kategori];
  const karya = useMemo(() => items.map((item) => item.karya), [items]);
  const { statuses, ready, error } = useStatusKarya(karya);
  const { state, error: stateError } = useStateJuri();
  const pilihanKandidat = getKandidatKategori(kategori, state);
  const stateRanks = getPeringkatKategori(kategori, state);
  const kandidatIds = useMemo(
    () => new Set(pilihanKandidat.map((kandidat) => kandidat.karyaId)),
    [pilihanKandidat],
  );
  const itemByKaryaId = useMemo(
    () => new Map(items.map((item) => [item.karya.id, item])),
    [items],
  );
  const peringkat = useMemo(
    () =>
      stateRanks.flatMap((rank) => {
        const item = itemByKaryaId.get(rank.karyaId);
        if (
          !item ||
          !kandidatIds.has(rank.karyaId) ||
          (statuses[rank.karyaId] ?? item.karya.status) !== "diverifikasi"
        ) {
          return [];
        }
        return [{ ...rank, peserta: item }];
      }),
    [itemByKaryaId, kandidatIds, stateRanks, statuses],
  );
  const podiumRanks = Array.from(
    { length: aturan.jumlahJuara },
    (_, index) => index + 1,
  );
  if (podiumRanks.length > 1) {
    [podiumRanks[0], podiumRanks[1]] = [podiumRanks[1], podiumRanks[0]];
  }
  const winnersByRank = useMemo(
    () => new Map(peringkat.map((rank) => [rank.peringkat, rank])),
    [peringkat],
  );
  const peringkatLanjutan = useMemo(
    () => peringkat.filter((rank) => rank.peringkat > aturan.jumlahJuara),
    [peringkat, aturan.jumlahJuara],
  );
  const peringkatTerfilter = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("id-ID");
    if (!searchTerm) {
      return peringkatLanjutan;
    }
    return peringkatLanjutan.filter(
      ({ peserta }) =>
        peserta.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
        peserta.asal.toLocaleLowerCase("id-ID").includes(searchTerm),
    );
  }, [peringkatLanjutan, query]);
  const peringkatPertamaLanjutan = aturan.jumlahJuara + 1;
  const jumlahPeringkatLanjutan =
    aturan.jumlahPeringkat - aturan.jumlahJuara;

  if (role === "juri" && !ready) {
    return (
      <main className="mx-auto max-w-[920px]">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
            {error}
          </p>
        )}
        <p role="status" className="text-sm text-[#84918b]">
          Memuat daftar karya...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[920px]">
      {(error || stateError) && (
        <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
          {error || stateError}
        </p>
      )}
      <header className="mb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-[#24453b]">
          Pemenang {judulKategori}
        </h1>
        <p className="mt-1 text-xs text-[#84918b]">
          Papan peringkat karya pemenang lomba {judulKategori}, ditetapkan juri
          setelah berunding.
        </p>
      </header>

      <section className="rounded-xl border border-[#aab5b0] bg-white p-4 shadow-[0_2px_8px_rgba(27,61,49,0.06)] sm:p-5">
        <div className="mb-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#84918b]">
            PAPAN PERINGKAT
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#24453b]">
            {judulKategori}
          </h2>
        </div>

        <p className="mb-3 text-center text-xs font-bold tracking-[0.16em] text-[#356454]">
          PEMENANG {judulKategori.toLocaleUpperCase("id-ID")}
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-3">
          {podiumRanks.map((peringkatJuara, index) => {
            const winner = winnersByRank.get(peringkatJuara);
            const medalStyle = MEDAL_STYLES[index] ?? MEDAL_STYLES[2];

            return (
              <article
                key={peringkatJuara}
                className={`relative flex min-h-[190px] flex-col rounded-xl border-2 p-3 ${
                  winner
                    ? `${medalStyle.border} bg-white`
                    : "border-dashed border-[#dce5e0] bg-[#f7f9f8] opacity-70"
                }`}
              >
                <span
                  aria-label={`Peringkat ${peringkatJuara}`}
                  className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums ${medalStyle.badge}`}
                >
                  {peringkatJuara}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 28 30"
                  fill="none"
                  className={`absolute right-[18px] top-[43px] size-7 ${medalStyle.ribbon}`}
                >
                  <path
                    d="M7 2H21V13L24 25L14 20L4 25L7 13V2Z"
                    fill="currentColor"
                    fillOpacity=".22"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                {winner ? (
                  <>
                    <div className="pr-12">
                      <h3 className="break-words text-sm font-bold uppercase text-[#29463d]">
                        {winner.peserta.nama}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold text-[#64716c]">
                        Lomba {kategori === "cerita" ? "Cerita" : "Komik"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#89958f]">
                        {winner.peserta.asal}
                      </p>
                    </div>
                    <p className="mt-3 text-[10px] text-[#84918b]">
                      Ditetapkan oleh {winner.ditetapkanOleh} pada{" "}
                      {formatTanggal(
                        new Date(winner.ditetapkanPada).toISOString().slice(0, 10),
                      )}
                    </p>
                    <Link
                      href={getDetailKaryaHref(winner.karyaId, kategori, role)}
                      className="mt-auto block rounded-lg bg-[#245c4f] px-3 py-2.5 text-center text-[10px] font-semibold text-white transition hover:bg-[#19483e]"
                    >
                      Lihat karya
                    </Link>
                  </>
                ) : (
                  <p className="my-auto pr-12 text-xs font-medium text-[#9aa49f]">
                    Belum ditetapkan
                  </p>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[10px] text-[#84918b]">
          {/* TODO: status pengumuman dirilis akan dibaca dari tabel pengaturan. */}
          Hasil sementara; masih dapat berubah sebelum hari pengumuman.
        </p>

        {aturan.jumlahPeringkat > aturan.jumlahJuara && (
          <section className="mt-5 rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#18a394] bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#29463d]">
                  Peringkat {peringkatPertamaLanjutan}-{aturan.jumlahPeringkat}
                </h2>
                <p className="mt-1 text-xs text-[#84918b]">
                  Peserta dengan peringkat berikutnya
                </p>
              </div>
              <label className="sr-only" htmlFor={`winner-search-${kategori}`}>
                Cari nama atau asal peserta
              </label>
              <input
                id={`winner-search-${kategori}`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau asal peserta"
                className="h-10 w-full rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15 sm:max-w-[280px]"
              />
            </div>

            <p className="mt-4 text-xs text-[#718079]">
              {peringkatLanjutan.length} dari {jumlahPeringkatLanjutan} peringkat
              terisi
            </p>

            {peringkatLanjutan.length === 0 ? (
              <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
                Belum ada peserta di peringkat {peringkatPertamaLanjutan} sampai{" "}
                {aturan.jumlahPeringkat}
              </p>
            ) : peringkatTerfilter.length === 0 ? (
              <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
                Tidak ada peserta yang cocok
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {peringkatTerfilter.map((rank) => (
                  <li
                    key={rank.karyaId}
                    className="flex items-center gap-3 rounded-lg border border-[#e3eae6] bg-white p-3"
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-[#64716c]">
                      {rank.peringkat}
                    </span>
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eaf4ef] text-[10px] font-bold text-[#356454]"
                    >
                      {getInisial(rank.peserta.nama)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-[#345248]">
                        {rank.peserta.nama}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#89958f]">
                        {rank.peserta.asal}
                      </span>
                    </span>
                    <Link
                      href={getDetailKaryaHref(rank.karyaId, kategori, role)}
                      className="shrink-0 rounded-lg bg-[#245c4f] px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#19483e]"
                    >
                      Lihat karya
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
