import type { StatusKarya } from "@/types/karya";

export const STATUS_KARYA: ReadonlyArray<{
  value: StatusKarya;
  label: string;
  color: string;
  badgeClass: string;
}> = [
  {
    value: "menunggu",
    label: "Menunggu",
    color: "#f2c96d",
    badgeClass: "bg-[#fff3ce] text-[#765b16]",
  },
  {
    value: "diproses",
    label: "Ditinjau",
    color: "#69a9ee",
    badgeClass: "bg-[#e4f1ff] text-[#245b8d]",
  },
  {
    value: "diverifikasi",
    label: "Diverifikasi",
    color: "#245c4f",
    badgeClass: "bg-[#dcf6e8] text-[#1f6746]",
  },
  {
    value: "ditolak",
    label: "Ditolak",
    color: "#e86d79",
    badgeClass: "bg-[#ffe5e8] text-[#a33340]",
  },
];

export const STATUS_LABEL: Readonly<Record<StatusKarya, string>> = {
  menunggu: "Menunggu",
  diproses: "Ditinjau",
  diverifikasi: "Diverifikasi",
  ditolak: "Ditolak",
};

export function getStatusLabel(status: StatusKarya): string {
  return STATUS_LABEL[status];
}

export function getStatusStyle(status: StatusKarya) {
  return STATUS_KARYA.find((item) => item.value === status);
}
