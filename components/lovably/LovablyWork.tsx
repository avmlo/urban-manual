"use client";

import { useEffect, useRef, useState } from "react";

interface Project {
  name: string;
  category: string;
  description: string;
  color: string;
}

const projects: Project[] = [
  {
    name: "SOL WAY",
    category: "Arts & Culture",
    description: "Brand identity and website for an arts and culture consultancy",
    color: "#E8DDD3",
  },
  {
    name: "Neal Beckstedt Studio",
    category: "Interior Design",
    description: "Brand refinement and digital presence for an acclaimed design studio",
    color: "#D4DDE0",
  },
  {
    name: "Sugarhouse Architecture",
    category: "Architecture",
    description: "Complete brand identity and web design for a custom architecture firm",
    color: "#DDE0D4",
  },
  {
    name: "David Lewis Gallery",
    category: "Art Gallery",
    description: "Identity and digital platform for a contemporary art gallery",
    color: "#E0D4D8",
  },
  {
    name: "Fink & Platt",
    category: "Architecture",
    description: "Brand architecture and positioning for an architectural practice",
    color: "#D8D4E0",
  },
  {
    name: "Zoë Feldman Design",
    category: "Interior Design",
    description: "Web design and brand narrative for an interior design firm",
    color: "#E0DCD4",
  },
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
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
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="group cursor-pointer"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.7s ease-out ${index * 0.1}s, transform 0.7s ease-out ${index * 0.1}s`,
      }}
    >
      {/* Project thumbnail placeholder */}
      <div
        className="aspect-[4/3] rounded-sm overflow-hidden mb-5 transition-transform duration-500 group-hover:scale-[1.02]"
        style={{ backgroundColor: project.color }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="font-serif text-[clamp(1.5rem,3vw,2.5rem)] text-[#1A1A1A]/20 tracking-[-0.02em]">
            {project.name}
          </span>
        </div>
      </div>

      {/* Project info */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[17px] md:text-[19px] text-[#1A1A1A] tracking-[-0.01em]">
          {project.name}
        </h3>
        <span className="text-[12px] tracking-[0.08em] uppercase text-[#999] whitespace-nowrap">
          {project.category}
        </span>
      </div>
      <p className="mt-1.5 text-[14px] text-[#888] leading-[1.6]">
        {project.description}
      </p>
    </div>
  );
}

export function LovablyWork() {
  return (
    <section id="work" className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto">
      <div className="flex items-baseline justify-between mb-16 md:mb-20">
        <h2 className="text-[12px] tracking-[0.12em] uppercase text-[#999]">
          Selected Work
        </h2>
        <span className="text-[12px] tracking-[0.08em] text-[#BBB]">
          2014 — Present
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 md:gap-y-20">
        {projects.map((project, i) => (
          <ProjectCard key={project.name} project={project} index={i} />
        ))}
      </div>
    </section>
  );
}
