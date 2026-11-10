"use client";

import { useState } from "react";
import ChartPendaftaran from "@/components/dashboard/ChartPendaftaran";
import DonutStatus from "@/components/dashboard/DonutStatus";
import StatCard, {
  type FilterKategori,
} from "@/components/dashboard/StatCard";
import TabelPeserta from "@/components/dashboard/TabelPeserta";
import { STATUS_KARYA, getStatusLabel } from "@/lib/status";
import type {
  KategoriLomba,
  PesertaDashboardRingkas,
  StatusKarya,
} from "@/types/karya";

type DashboardContentProps = {
  rows: PesertaDashboardRingkas[];
};

const STATUS_CARDS: ReadonlyArray<{
  status: StatusKarya;
  label: string;
}> = STATUS_KARYA.map((status) => ({
  status: status.value,
  label: getStatusLabel(status.value),
}));

function filterByCategory<T extends { kategori: KategoriLomba }>(
  values: T[],
  filter: FilterKategori,
): T[] {
  return filter === "semua"
    ? values
    : values.filter((value) => value.kategori === filter);
}

export default function DashboardContent({
  rows,
}: DashboardContentProps) {
  const [filter, setFilter] = useState<FilterKategori>("semua");
  const filteredRows = filterByCategory(rows, filter);
  const filteredParticipants = filteredRows;
  const filteredWorks = filteredRows.map((row) => row.karya);
  const countsByStatus = STATUS_KARYA.reduce<Record<StatusKarya, number>>(
    (counts, status) => {
      counts[status.value] = filteredWorks.filter(
        (item) => item.status === status.value,
      ).length;
      return counts;
    },
    { menunggu: 0, diproses: 0, diverifikasi: 0, ditolak: 0 },
  );
  const countsByCategory: Record<KategoriLomba, number> = {
    cerita: filteredParticipants.filter((person) => person.kategori === "cerita")
      .length,
    komik: filteredParticipants.filter((person) => person.kategori === "komik")
      .length,
  };

  const statCards = [
    { title: "Total daftar", value: filteredParticipants.length },
    { title: "Total karya", value: filteredWorks.length },
    ...STATUS_CARDS.map(({ status, label }) => ({
      title: label,
      value: countsByStatus[status],
    })),
  ];

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            filter={filter}
            onFilterChange={setFilter}
          />
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPendaftaran
          cerita={countsByCategory.cerita}
          komik={countsByCategory.komik}
          total={filteredParticipants.length}
        />
        <DonutStatus total={filteredWorks.length} counts={countsByStatus} />
      </div>

      <TabelPeserta rows={rows} />
    </>
  );
}
