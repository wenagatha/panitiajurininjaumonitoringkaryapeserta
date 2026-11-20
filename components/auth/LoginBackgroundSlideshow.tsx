"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/login-slides/juara.jpg",
    alt: "Cuplikan komik tentang para juara lomba",
  },
  {
    src: "/login-slides/cerita.jpg",
    alt: "Cuplikan komik tentang proses dan cerita di balik karya",
  },
  {
    src: "/login-slides/kemenangan.jpg",
    alt: "Cuplikan komik tentang semangat meraih kemenangan",
  },
];

export default function LoginBackgroundSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const showSlide = (direction: number) => {
    setActiveSlide(
      (current) => (current + direction + slides.length) % slides.length,
    );
  };

  return (
    <>
      <div
        aria-label="Foto cerita peserta lomba"
        className="absolute inset-0"
        role="region"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            aria-hidden={activeSlide !== index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              activeSlide === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="scale-110 object-cover opacity-70 blur-2xl"
            />
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        ))}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,32,55,0.82)_0%,rgba(5,32,55,0.42)_52%,rgba(5,32,55,0.72)_100%)]"
        />
      </div>

      <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => showSlide(-1)}
          aria-label="Foto latar sebelumnya"
          className="flex size-8 items-center justify-center rounded-full bg-black/35 text-lg text-white transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ‹
        </button>
        <div className="flex items-center gap-2" aria-label="Pilih foto latar">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Tampilkan foto ${index + 1} dari ${slides.length}`}
              aria-current={activeSlide === index ? "true" : undefined}
              className={`h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                activeSlide === index
                  ? "w-6 bg-white"
                  : "w-2 bg-white/55 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => showSlide(1)}
          aria-label="Foto latar berikutnya"
          className="flex size-8 items-center justify-center rounded-full bg-black/35 text-lg text-white transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ›
        </button>
      </div>
    </>
  );
}
