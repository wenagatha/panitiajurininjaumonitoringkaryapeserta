export function normalisasiWhatsApp(nomor: string): string {
  const digits = nomor.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}
