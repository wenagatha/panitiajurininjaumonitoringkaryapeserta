import AuthForm from "@/components/auth/AuthForm";
import Image from "next/image";

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/image/logo-kemenham.png"
        alt="Logo Kementerian Hukum dan HAM RI"
        width={40}
        height={40}
        className="size-10 object-contain"
      />
      <span
        className={`text-sm font-bold ${
          light ? "text-white" : "text-[#17483f]"
        }`}
      >
        Kementerian Hukum dan HAM RI
      </span>
    </div>
  );
}

function LoginArtwork() {
  return (
    <div className="absolute inset-x-0 bottom-20 hidden justify-center px-8 sm:bottom-20 lg:flex">
      {/* TODO: Replace this placeholder with /assets/ilustrasi-login.png when available. */}
      <svg
        viewBox="0 0 520 340"
        role="img"
        aria-label="Ilustrasi dokumen dan piala"
        className="h-auto w-full max-w-[470px]"
      >
        <g fill="none" stroke="white" strokeOpacity=".16">
          <ellipse cx="273" cy="205" rx="227" ry="153" transform="rotate(-17 273 205)" />
          <ellipse cx="280" cy="211" rx="191" ry="126" transform="rotate(-17 280 211)" />
          <ellipse cx="285" cy="214" rx="154" ry="99" transform="rotate(-17 285 214)" />
        </g>
        <circle cx="454" cy="99" r="6" fill="#ffb07a" />
        <path d="m355 50 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe36c" />
        <g transform="rotate(-10 203 209)">
          <rect x="91" y="90" width="211" height="250" rx="16" fill="#faf8ef" />
          <rect x="111" y="112" width="39" height="39" rx="12" fill="#efa16e" />
          <rect x="111" y="172" width="148" height="8" rx="4" fill="#85a698" />
          <rect x="111" y="193" width="107" height="8" rx="4" fill="#dbe4dc" />
          <rect x="111" y="214" width="129" height="8" rx="4" fill="#dbe4dc" />
          <g transform="rotate(-8 254 259)">
            <rect x="234" y="239" width="49" height="31" rx="5" fill="none" stroke="#e78b5d" />
            <text x="258" y="258" textAnchor="middle" fill="#ce7850" fontSize="10" fontWeight="700">
              HAM
            </text>
          </g>
          <path d="m111 294 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="#f3c45d" />
        </g>
        <g transform="rotate(6 373 186)">
          <path
            d="M334 122h79l13 45c5 18-9 36-28 36h-49c-19 0-33-18-28-36l13-45Z"
            fill="#f0bd64"
          />
          <path d="M337 137h-17c-15 0-19 31 2 38m79-38h17c15 0 19 31-2 38" fill="none" stroke="#e6a551" strokeWidth="13" strokeLinecap="round" />
          <path d="m373 147 5 11 12 1-9 8 3 12-11-6-10 6 2-12-9-8 12-1 5-11Z" fill="#fff8e6" />
          <path d="m357 202 33 0-5 34h-23l-5-34Z" fill="#d99546" />
          <rect x="342" y="231" width="64" height="17" rx="6" fill="#d28b43" />
        </g>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f2f4f3] p-4 sm:p-6 lg:items-center lg:p-8">
      <div className="grid w-full max-w-[1180px] grid-cols-1 overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(27,55,47,0.12)] lg:min-h-[min(90vh,760px)] lg:grid-cols-2 lg:rounded-[24px]">
        <section className="relative flex min-h-[330px] flex-col overflow-hidden bg-[linear-gradient(135deg,#0b5db9_0%,#138cc8_42%,#31b8b2_72%,#dce75a_100%)] px-[26px] py-6 text-white lg:min-h-[640px] lg:justify-between lg:p-12 xl:p-[48px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_88%,rgba(232,239,92,0.34),transparent_39%),radial-gradient(ellipse_at_38%_45%,rgba(44,196,200,0.28),transparent_45%)]"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 600 800"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            <g fill="none" stroke="white" strokeOpacity=".12">
              <ellipse cx="430" cy="650" rx="290" ry="180" transform="rotate(-28 430 650)" />
              <ellipse cx="430" cy="650" rx="250" ry="150" transform="rotate(-28 430 650)" />
              <ellipse cx="430" cy="650" rx="205" ry="120" transform="rotate(-28 430 650)" />
            </g>
          </svg>

          <div className="relative z-10">
            <Brand light />
            <div className="mt-8 lg:mt-10 xl:mt-[38px]">
              <p className="text-xs font-bold tracking-[0.16em] text-[#ffe064] lg:text-sm">
                RUANG KOLABORASI
              </p>
              <h1 className="mt-4 max-w-[520px] text-[28px] font-bold leading-[1.24] tracking-[-0.035em] lg:mt-5 lg:text-[clamp(2.5rem,4vw,3.2rem)] lg:leading-[1.14]">
                Monitoring Lomba, Penilaian, dan Karya Peserta.
              </h1>
              <p className="mt-5 max-w-[480px] text-[15px] leading-6 text-white/80 lg:mt-6 lg:text-lg lg:leading-7 lg:text-white/75">
                Halaman ini hanya dapat diakses oleh panitia dan juri
              </p>
            </div>
          </div>

          <LoginArtwork />
          <p className="relative z-10 mt-auto hidden text-xs font-medium text-white/70 lg:block">
            © 2026 Lomba Hari HAM
          </p>
        </section>

        <section className="flex items-start justify-center px-6 pt-9 pb-8 sm:px-12 lg:min-h-[min(90vh,760px)] lg:items-center lg:px-14 lg:py-10 xl:px-20">
          <div className="w-full max-w-[400px]">
            <AuthForm />
          </div>
        </section>
      </div>
    </main>
  );
}
