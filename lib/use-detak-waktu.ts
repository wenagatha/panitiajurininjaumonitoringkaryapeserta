"use client";

import { useEffect, useState } from "react";

export function useDetakWaktu(intervalMs: number): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initialTimeoutId = window.setTimeout(
      () => setNow(Date.now()),
      0,
    );
    const intervalId = window.setInterval(
      () => setNow(Date.now()),
      intervalMs,
    );
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [intervalMs]);

  return now;
}
