"use client";

import { useEffect, useState } from "react";

export function useDetakWaktu(intervalMs: number): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setNow(Date.now()),
      intervalMs,
    );
    return () => window.clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
