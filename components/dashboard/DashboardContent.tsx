"use client";

import { useMemo, useState } from "react";
import ChartPendaftaran from "@/components/dashboard/ChartPendaftaran";
import DonutStatus from "@/components/dashboard/DonutStatus";
import StatCard, {
  type FilterKategori,
} from "@/components/dashboard/StatCard";
import TabelPeserta from "@/components/dashboard/TabelPeserta";
import { STATUS_KARYA, getStatusLabel } from "@/lib/status";
import { useStatusKarya } from "@/lib/review-status";
import type {
  KaryaRingkas,
  KategoriLomba,
  PesertaRingkas,
  PesertaDashboardRingkas,
  StatusKarya,
} from "@/types/karya";

type DashboardContentProps = {
  peserta: PesertaRingkas[];
  karya: KaryaRingkas[];
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
  peserta,
  karya,
}: DashboardContentProps) {
  const [filter, setFilter] = useState<FilterKategori>("semua");
  const { statuses, error } = useStatusKarya(karya);

  const rows = useMemo(() => {
    const worksByParticipant = new Map(
      karya.map((item) => [item.pesertaId, item]),
    );

    return peserta.map(
      (person): PesertaDashboardRingkas => {
        const record = worksByParticipant.get(person.id);
        if (!record) {
          throw new Error(`Karya peserta ${person.id} tidak ditemukan.`);
        }
        return {
          ...person,
          karya: { ...record, status: statuses[record.id] ?? record.status },
        };
      },
    );
  }, [karya, peserta, statuses]);

  const filteredParticipants = filterByCategory(peserta, filter);
  const filteredParticipantIds = new Set(
    filteredParticipants.map((person) => person.id),
  );
  const filteredWorks = karya.filter((item) =>
    filteredParticipantIds.has(item.pesertaId),
  );
  const countsByStatus = STATUS_KARYA.reduce<Record<StatusKarya, number>>(
    (counts, status) => {
      counts[status.value] = filteredWorks.filter(
        (item) => (statuses[item.id] ?? item.status) === status.value,
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
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
          {error}
        </p>
      )}
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
