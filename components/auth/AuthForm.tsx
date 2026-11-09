"use client";

import { useState, type FormEvent } from "react";

type Credentials = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof Credentials, string>>;
type TouchedFields = Partial<Record<keyof Credentials, boolean>>;

function validateCredentials(credentials: Credentials): FieldErrors {
  const errors: FieldErrors = {};
  const email = credentials.email.trim();

  if (!email) {
    errors.email = "Email wajib diisi";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format email tidak valid";
  }

  if (!credentials.password) {
    errors.password = "Kata sandi wajib diisi";
  } else if (credentials.password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter";
  }

  return errors;
}

export default function AuthForm() {
  const [credentials, setCredentials] = useState<Credentials>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<TouchedFields>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const validationErrors = validateCredentials(credentials);
  const visibleErrors: FieldErrors = {};

  if (touched.email || hasSubmitted) {
    visibleErrors.email = validationErrors.email;
  }
  if (touched.password || hasSubmitted) {
    visibleErrors.password = validationErrors.password;
  }

  const updateField = (field: keyof Credentials, value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }));
    setServerError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setServerError("");

    const errors = validateCredentials(credentials);
    if (errors.email || errors.password) {
      return;
    }

    setIsLoading(true);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 600));
      // TODO: sambungkan ke Supabase Auth.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold tracking-[0.17em] text-[#54756b]">
        AKSES PANITIA &amp; JURI
      </p>
      <h2 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#123f36] lg:mt-3">
        Selamat Datang
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#707b78] lg:mt-3">
        Masuk untuk mengelola lomba, menilai karya peserta, dan memantau hasil
        penilaian.
      </p>

      <form className="mt-6 space-y-3 lg:mt-7 lg:space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-[13px] font-medium text-[#263b36]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={credentials.email}
            onChange={(event) => updateField("email", event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            aria-invalid={Boolean(visibleErrors.email)}
            aria-describedby={visibleErrors.email ? "email-error" : undefined}
            className={`h-11 w-full rounded-lg border bg-white px-4 text-sm text-[#203c35] outline-none transition placeholder:text-[#94a09c] focus:border-[#438272] focus:ring-4 focus:ring-[#438272]/10 lg:h-12 ${
              visibleErrors.email ? "border-red-400" : "border-[#d7dfdc]"
            }`}
          />
          {visibleErrors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-600">
              {visibleErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-[13px] font-medium text-[#263b36]"
          >
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Minimal 8 karakter"
              value={credentials.password}
              onChange={(event) => updateField("password", event.target.value)}
              onBlur={() =>
                setTouched((current) => ({ ...current, password: true }))
              }
              aria-invalid={Boolean(visibleErrors.password)}
              aria-describedby={
                visibleErrors.password ? "password-error" : undefined
              }
              className={`h-11 w-full rounded-lg border bg-white py-3 pl-4 pr-28 text-sm text-[#203c35] outline-none transition placeholder:text-[#94a09c] focus:border-[#438272] focus:ring-4 focus:ring-[#438272]/10 lg:h-12 ${
                visibleErrors.password ? "border-red-400" : "border-[#d7dfdc]"
              }`}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              aria-label={
                isPasswordVisible ? "Sembunyikan kata sandi" : "Lihat kata sandi"
              }
              aria-pressed={isPasswordVisible}
              className="absolute inset-y-0 right-0 rounded-r-lg px-4 text-xs font-semibold text-[#285c4f] transition hover:text-[#173f35] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#438272]"
            >
              {isPasswordVisible ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
          {visibleErrors.password && (
            <p id="password-error" className="mt-1.5 text-xs text-red-600">
              {visibleErrors.password}
            </p>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-[#245c4f] px-4 text-sm font-bold text-white shadow-[0_5px_12px_rgba(24,73,61,0.16)] transition hover:bg-[#1d4e43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245c4f] disabled:cursor-not-allowed disabled:opacity-65 lg:h-12"
        >
          {isLoading ? "Memproses..." : "Masuk ke akun"}
        </button>
      </form>
    </div>
  );
}
