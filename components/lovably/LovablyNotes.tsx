"use client";

import { useEffect, useRef, useState } from "react";

interface Note {
  title: string;
  date: string;
  excerpt: string;
}

const notes: Note[] = [
  {
    title: "Four Things to Know About Lovably",
    date: "2024",
    excerpt:
      "We value craftsmanship. Our process is detail-oriented and methodical, and we never let convenience or expedience threaten the quality of our work.",
  },
  {
    title: "How We Will and Won't Use AI",
    date: "2024",
    excerpt:
      "We refrain from using generative artificial intelligence for design and correspondence, while embracing its potential for tasks where it enhances rather than replaces human thought.",
  },
  {
    title: "Ten Years of Lovably",
    date: "2024",
    excerpt:
      "A reflection on a decade of shaping brands with optimism and precision, from our earliest projects to the studio we are today.",
  },
];

export function LovablyNotes() {
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
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="notes"
      ref={sectionRef}
      className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto border-t border-[#E8E4DE]"
    >
      <div className="flex items-baseline justify-between mb-16 md:mb-20">
        <h2 className="text-[12px] tracking-[0.12em] uppercase text-[#999]">
          Notes
        </h2>
        <span className="text-[13px] text-[#BBB]">
          Occasional thoughts from the desk of our Design Director
        </span>
      </div>

      <div className="space-y-0">
        {notes.map((note, i) => (
          <div
            key={note.title}
            className="group cursor-pointer border-b border-[#E8E4DE] py-8 md:py-10 flex flex-col md:flex-row md:items-baseline gap-4 md:gap-12"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.6s ease-out ${i * 0.15}s, transform 0.6s ease-out ${i * 0.15}s`,
            }}
          >
            <span className="text-[12px] tracking-[0.08em] uppercase text-[#BBB] md:w-20 shrink-0">
              {note.date}
            </span>
            <div className="flex-1">
              <h3 className="text-[19px] md:text-[22px] text-[#1A1A1A] tracking-[-0.01em] group-hover:text-[#555] transition-colors duration-300 mb-2">
                {note.title}
              </h3>
              <p className="text-[15px] text-[#888] leading-[1.65] max-w-[600px]">
                {note.excerpt}
              </p>
            </div>
            <span className="text-[13px] text-[#BBB] group-hover:text-[#888] transition-colors duration-300 shrink-0">
              Read
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
