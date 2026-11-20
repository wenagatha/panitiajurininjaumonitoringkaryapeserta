import AuthForm from "@/components/auth/AuthForm";
import LoginBackgroundSlideshow from "@/components/auth/LoginBackgroundSlideshow";
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
        Kementerian HAM RI
      </span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f2f4f3] p-4 sm:p-6 lg:items-center lg:p-8">
      <div className="grid w-full max-w-[1180px] grid-cols-1 overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(27,55,47,0.12)] lg:min-h-[min(90vh,760px)] lg:grid-cols-2 lg:rounded-[24px]">
        <section className="relative flex min-h-[330px] flex-col overflow-hidden bg-[#102e43] px-[26px] py-6 text-white lg:min-h-[640px] lg:justify-between lg:p-12 xl:p-[48px]">
          <LoginBackgroundSlideshow />

          <div className="relative z-10">
            <Brand light />
            <div className="mt-8 lg:mt-10 xl:mt-[38px]">
              <h1 className="mt-4 max-w-[520px] text-[28px] font-bold leading-[1.24] tracking-[-0.035em] [text-shadow:0_2px_14px_rgba(0,0,0,0.4)] lg:mt-5 lg:text-[clamp(2.5rem,4vw,3.2rem)] lg:leading-[1.14]">
                Verifikasi dan Penilaian Karya Lomba Hari HAM 2026
              </h1>
            </div>
          </div>

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
