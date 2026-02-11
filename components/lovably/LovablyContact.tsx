"use client";

import { useEffect, useRef, useState } from "react";

export function LovablyContact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="px-6 md:px-12 py-32 md:py-44 max-w-[1400px] mx-auto border-t border-[#E8E4DE] text-center"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
      }}
    >
      <h2 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.05] tracking-[-0.03em] text-[#1A1A1A] mb-6">
        Interested?
      </h2>
      <p className="font-serif italic text-[clamp(1.5rem,3vw,2.5rem)] text-[#888] mb-12">
        Tell us why.
      </p>
      <a
        href="mailto:hello@lovably.com"
        className="inline-block text-[14px] tracking-[0.08em] uppercase text-[#1A1A1A] border-b border-[#1A1A1A] pb-1 hover:text-[#666] hover:border-[#666] transition-colors duration-300"
      >
        hello@lovably.com
      </a>
    </section>
  );
}
