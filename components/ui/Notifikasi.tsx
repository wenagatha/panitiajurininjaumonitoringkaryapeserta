"use client";

import { useCallback, useEffect, useState } from "react";

type NotifikasiData = {
  id: number;
  pesan: string;
};

export function useNotifikasi() {
  const [notifikasi, setNotifikasi] = useState<NotifikasiData | null>(null);

  const tampilkanNotifikasi = useCallback((pesan: string) => {
    setNotifikasi({ id: Date.now(), pesan });
  }, []);

  useEffect(() => {
    if (!notifikasi) {
      return;
    }
    const timeout = window.setTimeout(() => setNotifikasi(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notifikasi]);

  const tutupNotifikasi = useCallback(() => setNotifikasi(null), []);

  return { notifikasi, tampilkanNotifikasi, tutupNotifikasi };
}

export default function Notifikasi({
  notifikasi,
  onClose,
}: {
  notifikasi: NotifikasiData | null;
  onClose: () => void;
}) {
  if (!notifikasi) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-4 rounded-lg border border-[#cce8d9] bg-white px-4 py-3 text-xs font-medium text-[#1f6746] shadow-lg"
    >
      <span>{notifikasi.pesan}</span>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={onClose}
        className="shrink-0 text-[#718079] hover:text-[#29463d]"
      >
        ×
      </button>
    </div>
  );
}
