"use client";

import { useCallback, useEffect, useState } from "react";
import type { Karya, StatusKarya } from "@/types/karya";

export const REVIEW_STATUS_STORAGE_KEY = "monitoring-karya-review-status";
const REVIEW_STATUS_EVENT = "monitoring-karya-review-status-change";
// TODO: ganti dengan data dan update status dari Supabase.

const VALID_STATUSES: readonly StatusKarya[] = [
  "menunggu",
  "diproses",
  "diverifikasi",
  "ditolak",
];

function isStatusKarya(value: unknown): value is StatusKarya {
  return VALID_STATUSES.some((status) => status === value);
}

export function readReviewStatuses(): Record<string, StatusKarya> {
  const stored = window.localStorage.getItem(REVIEW_STATUS_STORAGE_KEY);
  if (!stored) {
    return {};
  }

  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Data status tinjauan di browser tidak valid.");
  }

  const statuses: Record<string, StatusKarya> = {};
  for (const [id, status] of Object.entries(parsed)) {
    if (!isStatusKarya(status)) {
      throw new Error("Data status tinjauan di browser tidak valid.");
    }
    statuses[id] = status;
  }
  return statuses;
}

export function writeReviewStatuses(
  statuses: Record<string, StatusKarya>,
): void {
  window.localStorage.setItem(
    REVIEW_STATUS_STORAGE_KEY,
    JSON.stringify(statuses),
  );
  window.dispatchEvent(new Event(REVIEW_STATUS_EVENT));
}

export function useStatusKarya(
  karya: readonly Pick<Karya, "id" | "status">[],
) {
  const karyaKey = JSON.stringify(
    karya.map(({ id, status }) => [id, status]),
  );
  const [statuses, setStatuses] = useState<Record<string, StatusKarya>>(() =>
    Object.fromEntries(karya.map((item) => [item.id, item.status])),
  );
  const [loadedKaryaKey, setLoadedKaryaKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ready = loadedKaryaKey === karyaKey;

  const loadStatuses = useCallback(() => {
    try {
      const savedStatuses = readReviewStatuses();
      setStatuses(
        Object.fromEntries(
          karya.map((item) => [
            item.id,
            savedStatuses[item.id] ?? item.status,
          ]),
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Status karya gagal dibaca: ${cause.message}`
          : "Status karya gagal dibaca dari penyimpanan browser.",
      );
    } finally {
      setLoadedKaryaKey(karyaKey);
    }
  }, [karya, karyaKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadStatuses, 0);
    window.addEventListener("storage", loadStatuses);
    window.addEventListener(REVIEW_STATUS_EVENT, loadStatuses);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", loadStatuses);
      window.removeEventListener(REVIEW_STATUS_EVENT, loadStatuses);
    };
  }, [loadStatuses]);

  const setStatus = useCallback(
    (id: string, status: StatusKarya): boolean => {
      try {
        const nextStatuses = { ...readReviewStatuses(), [id]: status };
        writeReviewStatuses(nextStatuses);
        setStatuses((current) => ({ ...current, [id]: status }));
        setError("");
        return true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `Status karya gagal disimpan: ${cause.message}`
            : "Status karya gagal disimpan ke penyimpanan browser.",
        );
        return false;
      }
    },
    [],
  );

  return { statuses, setStatus, ready, error };
}
