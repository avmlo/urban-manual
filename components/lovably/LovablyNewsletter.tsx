"use client";

import { useEffect, useRef, useState } from "react";

export function LovablyNewsletter() {
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
      ref={sectionRef}
      className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto border-t border-[#E8E4DE]"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
      }}
    >
      <div className="max-w-[600px]">
        <h2 className="text-[12px] tracking-[0.12em] uppercase text-[#999] mb-8">
          The Exact
        </h2>
        <p className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.25] tracking-[-0.02em] text-[#1A1A1A] mb-6">
          A celebration of good design
          <br />
          from around the world.
        </p>
        <p className="text-[15px] text-[#888] leading-[1.7] mb-10">
          Curated by Lovably and delivered to your inbox once monthly, with
          weekly posts on Instagram.
        </p>

        {/* Email signup */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 px-4 py-3 text-[15px] bg-transparent border border-[#D6D2CC] rounded-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:border-[#999] transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 text-[13px] tracking-[0.08em] uppercase bg-[#1A1A1A] text-[#FAF9F6] rounded-sm hover:bg-[#333] transition-colors duration-300"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
