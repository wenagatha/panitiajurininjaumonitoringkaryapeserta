"use client";

import { useMemo, useState } from "react";
import { getStatusLabel, getStatusStyle } from "@/lib/status";
import type {
  KategoriLomba,
  PesertaDashboardRingkas,
} from "@/types/karya";

type FilterKategori = "semua" | KategoriLomba;

function formatTanggal(tanggal: string): string {
  const date = new Date(`${tanggal}T00:00:00`);
  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

export default function TabelPeserta({
  rows,
}: {
  rows: PesertaDashboardRingkas[];
}) {
  const [query, setQuery] = useState("");
  const [filterKategori, setFilterKategori] =
    useState<FilterKategori>("semua");

  const filteredRows = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("id-ID");
    return rows
      .filter((row) => {
        const matchesSearch =
          !searchTerm ||
          row.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
          row.asal.toLocaleLowerCase("id-ID").includes(searchTerm);
        const matchesKategori =
          filterKategori === "semua" || row.kategori === filterKategori;
        return matchesSearch && matchesKategori;
      })
      .sort(
        (first, second) =>
          new Date(second.tanggalDaftar).getTime() -
          new Date(first.tanggalDaftar).getTime(),
      );
  }, [filterKategori, query, rows]);

  return (
    <section className="rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#5196d8] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-6">
      <h2 className="text-sm font-bold text-[#29463d]">Daftar peserta</h2>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor="dashboard-participant-search">
          Cari nama atau asal peserta
        </label>
        <input
          id="dashboard-participant-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama atau asal peserta"
          className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15"
        />
        <label className="sr-only" htmlFor="dashboard-category-filter">
          Filter lomba
        </label>
        <select
          id="dashboard-category-filter"
          value={filterKategori}
          onChange={(event) =>
            setFilterKategori(event.target.value as FilterKategori)
          }
          className="h-10 rounded-lg border border-[#dfe6e2] bg-white px-3 text-xs text-[#42564e] outline-none focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15 sm:w-[170px]"
        >
          <option value="semua">Semua lomba</option>
          <option value="cerita">Lomba Cerita</option>
          <option value="komik">Lomba Komik</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e8eeea] text-[10px] font-semibold tracking-[0.04em] text-[#84908b]">
              <th scope="col" className="px-2 py-3">PESERTA</th>
              <th scope="col" className="px-2 py-3">LOMBA</th>
              <th scope="col" className="px-2 py-3">DAFTAR</th>
              <th scope="col" className="px-2 py-3">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const status = row.karya.status;
              const statusStyle = getStatusStyle(status);
              return (
                <tr
                  key={row.id}
                  className="border-b border-[#edf1ee] last:border-0"
                >
                  <td className="px-2 py-3">
                    <p className="text-xs font-semibold text-[#345248]">{row.nama}</p>
                    <p className="mt-0.5 text-[10px] text-[#89958f]">{row.asal}</p>
                  </td>
                  <td className="px-2 py-3 text-xs text-[#63716b]">
                    {row.kategori === "cerita" ? "Cerita" : "Komik"}
                  </td>
                  <td className="px-2 py-3 text-xs text-[#63716b]">
                    {formatTanggal(row.tanggalDaftar)}
                  </td>
                  <td className="px-2 py-3">
                    {statusStyle && (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle.badgeClass}`}>
                        {getStatusLabel(status)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-10 text-center text-xs text-[#87938e]">
                  Tidak ada peserta yang cocok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
