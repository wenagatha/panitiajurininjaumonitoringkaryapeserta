"use client";

import type { KategoriLomba } from "@/types/karya";

export type FilterKategori = KategoriLomba | "semua";

const FILTER_CYCLE: readonly FilterKategori[] = ["semua", "cerita", "komik"];

function getNextFilter(filter: FilterKategori): FilterKategori {
  const currentIndex = FILTER_CYCLE.indexOf(filter);
  return FILTER_CYCLE[(currentIndex + 1) % FILTER_CYCLE.length];
}

export function getFilterLabel(filter: FilterKategori): string {
  if (filter === "cerita") return "Cerita";
  if (filter === "komik") return "Komik";
  return "Semua";
}

type StatCardProps = {
  title: string;
  value: number;
  filter: FilterKategori;
  onFilterChange: (filter: FilterKategori) => void;
};

export default function StatCard({
  title,
  value,
  filter,
  onFilterChange,
}: StatCardProps) {
  const nextFilter = getNextFilter(filter);

  return (
    <button
      type="button"
      onClick={() => onFilterChange(nextFilter)}
      aria-label={`${title}${filter === "semua" ? "" : ` ${getFilterLabel(filter)}`}: ${value}. Filter aktif ${getFilterLabel(filter)}. Klik untuk beralih ke ${getFilterLabel(nextFilter)}.`}
      className="flex min-h-[112px] flex-col rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#18845f] bg-white p-4 text-left shadow-[0_2px_8px_rgba(27,61,49,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(27,61,49,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245c4f]"
    >
      <span className="text-xs font-medium text-[#74817c]">
        {title}
        {filter !== "semua" && ` ${getFilterLabel(filter)}`}
      </span>
      <span
        aria-live="polite"
        className="mt-2 text-[26px] font-bold leading-none tracking-tight text-[#183f36]"
      >
        {value}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-3 text-[10px] text-[#9aa49f]">
        <span aria-hidden="true" className="flex items-center gap-1">
          {FILTER_CYCLE.map((item) => (
            <span
              key={item}
              className={`size-1.5 rounded-full ${
                filter === item ? "bg-[#245c4f]" : "bg-[#d5ddd9]"
              }`}
            />
          ))}
        </span>
        klik untuk ganti
      </span>
    </button>
  );
}
