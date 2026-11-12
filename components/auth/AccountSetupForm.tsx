"use client";

import { useState, type FormEvent } from "react";
import { completeAccountSetupAction } from "@/lib/auth-actions";

export default function AccountSetupForm({
  initialName,
}: {
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await completeAccountSetupAction(name, password);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Pengaturan akun gagal diproses. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#123f36]/55 p-4">
      <section
        aria-labelledby="account-setup-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
      >
        <p className="text-xs font-bold tracking-[0.14em] text-[#54756b]">
          PENGATURAN AKUN PERTAMA
        </p>
        <h1
          className="mt-2 text-2xl font-bold text-[#123f36]"
          id="account-setup-title"
        >
          Lengkapi identitas
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#707b78]">
          Masukkan nama yang akan tercatat pada aktivitas peninjauan dan buat
          kata sandi pribadi sebelum masuk ke dashboard.
        </p>
        <p className="mt-2 text-sm leading-5 text-red-700">
          Catat dan simpan kata sandi baru Anda di tempat yang aman, misalnya
          notebook pribadi. Saat ini belum tersedia fitur lupa kata sandi.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#263b36]"
              htmlFor="staff-name"
            >
              Nama
            </label>
            <input
              autoComplete="name"
              className="h-12 w-full rounded-lg border border-[#d7dfdc] px-4 text-sm text-[#203c35] outline-none focus:border-[#438272] focus:ring-4 focus:ring-[#438272]/10"
              id="staff-name"
              maxLength={100}
              minLength={2}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#263b36]"
              htmlFor="new-password"
            >
              Masukkan kata sandi baru
            </label>
            <div className="relative">
              <input
                autoComplete="new-password"
                className="h-12 w-full rounded-lg border border-[#d7dfdc] py-3 pl-4 pr-28 text-sm text-[#203c35] outline-none focus:border-[#438272] focus:ring-4 focus:ring-[#438272]/10"
                id="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={isPasswordVisible ? "text" : "password"}
                value={password}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                aria-label={
                  isPasswordVisible
                    ? "Sembunyikan kata sandi baru"
                    : "Lihat kata sandi baru"
                }
                aria-pressed={isPasswordVisible}
                className="absolute inset-y-0 right-0 rounded-r-lg px-4 text-xs font-semibold text-[#285c4f] transition hover:text-[#173f35] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#438272]"
              >
                {isPasswordVisible ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#84918b]">
              Minimal 8 karakter.
            </p>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#263b36]"
              htmlFor="password-confirmation"
            >
              Ulangi kata sandi baru
            </label>
            <div className="relative">
              <input
                autoComplete="new-password"
                className="h-12 w-full rounded-lg border border-[#d7dfdc] py-3 pl-4 pr-28 text-sm text-[#203c35] outline-none focus:border-[#438272] focus:ring-4 focus:ring-[#438272]/10"
                id="password-confirmation"
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
                type={isConfirmationVisible ? "text" : "password"}
                value={passwordConfirmation}
              />
              <button
                type="button"
                onClick={() =>
                  setIsConfirmationVisible((visible) => !visible)
                }
                aria-label={
                  isConfirmationVisible
                    ? "Sembunyikan konfirmasi kata sandi"
                    : "Lihat konfirmasi kata sandi"
                }
                aria-pressed={isConfirmationVisible}
                className="absolute inset-y-0 right-0 rounded-r-lg px-4 text-xs font-semibold text-[#285c4f] transition hover:text-[#173f35] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#438272]"
              >
                {isConfirmationVisible ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#245c4f] px-4 text-sm font-bold text-white transition hover:bg-[#1d4e43] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Menyimpan..." : "Simpan dan lanjutkan"}
          </button>
        </form>
      </section>
    </main>
  );
}
