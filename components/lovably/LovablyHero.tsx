"use client";

import { useEffect, useRef } from "react";

export function LovablyHero() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const heading = headingRef.current;
    const subtitle = subtitleRef.current;
    if (heading) {
      heading.style.opacity = "0";
      heading.style.transform = "translateY(30px)";
      requestAnimationFrame(() => {
        heading.style.transition = "opacity 1s ease-out, transform 1s ease-out";
        heading.style.opacity = "1";
        heading.style.transform = "translateY(0)";
      });
    }
    if (subtitle) {
      subtitle.style.opacity = "0";
      subtitle.style.transform = "translateY(20px)";
      setTimeout(() => {
        subtitle.style.transition =
          "opacity 0.8s ease-out, transform 0.8s ease-out";
        subtitle.style.opacity = "1";
        subtitle.style.transform = "translateY(0)";
      }, 400);
    }
  }, []);

  return (
    <section className="min-h-[85vh] flex flex-col justify-center px-6 md:px-12 max-w-[1400px] mx-auto pt-24">
      <div className="max-w-[900px]">
        <h1
          ref={headingRef}
          className="font-serif text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.03em] text-[#1A1A1A]"
        >
          Shaping sophisticated
          <br />
          brands with{" "}
          <em className="font-display italic font-normal">optimism</em>
          <br />
          &amp; precision
        </h1>
        <p
          ref={subtitleRef}
          className="mt-8 md:mt-10 text-[17px] md:text-[19px] leading-[1.7] text-[#666] max-w-[560px]"
        >
          Lovably is an independent branding, print, and web design studio in
          New York City.
        </p>
      </div>
    </section>
  );
}
