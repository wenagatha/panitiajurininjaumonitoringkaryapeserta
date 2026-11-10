"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { JuriContoh } from "@/lib/juri-contoh";

const JuriAktifContext = createContext<JuriContoh | null>(null);

export function JuriAktifProvider({
  juriAktif,
  children,
}: {
  juriAktif: JuriContoh;
  children: ReactNode;
}) {
  return (
    <JuriAktifContext.Provider value={juriAktif}>
      {children}
    </JuriAktifContext.Provider>
  );
}

export function useJuriAktif(): JuriContoh {
  const juriAktif = useContext(JuriAktifContext);
  if (!juriAktif) {
    throw new Error("useJuriAktif harus digunakan di dalam JuriAktifProvider.");
  }
  return juriAktif;
}
