"use client";

import { useEffect, useRef, useState } from "react";

const services = [
  "Brand Architecture",
  "Messaging",
  "Naming",
  "Narrative",
  "Portfolio",
  "Positioning",
];

const clients = [
  "Amy Meier",
  "Bednark",
  "Bloomberg",
  "David Lewis Gallery",
  "Fink & Platt",
  "Josh Greene Design",
  "Macmillan",
  "Neal Beckstedt",
  "Peachtree",
  "Rent the Runway",
  "SOL WAY",
  "Sugarhouse Architecture",
  "Susan Rothenberg",
  "The Metropolitan Museum of Art",
  "Zoë Feldman Design",
];

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
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
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
      }}
    >
      {children}
    </div>
  );
}

export function LovablyStudio() {
  return (
    <section
      id="studio"
      className="px-6 md:px-12 py-24 md:py-32 max-w-[1400px] mx-auto border-t border-[#E8E4DE]"
    >
      {/* Section label */}
      <h2 className="text-[12px] tracking-[0.12em] uppercase text-[#999] mb-16 md:mb-20">
        Studio
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        {/* Left column - About */}
        <AnimatedSection>
          <div className="max-w-[520px]">
            <h3 className="font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.15] tracking-[-0.02em] text-[#1A1A1A] mb-8">
              An independent design
              <br />
              studio in New York City
            </h3>
            <div className="space-y-5 text-[16px] leading-[1.75] text-[#666]">
              <p>
                Established in 2014 and centrally located in Manhattan, we have
                worked with hundreds of clients who are leaders in their fields.
              </p>
              <p>
                We approach our work with profound care, guided by a commitment to
                intelligent design and strategic clarity. Our practice emphasizes
                theory over impulse, restraint over noisiness, and lasting
                principles over fleeting trends.
              </p>
              <p>
                Lovably is an owner-run studio, with Creative Director Dylan Seeger
                leading each project we accept.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Right column - Services & Clients */}
        <div className="space-y-16">
          <AnimatedSection>
            <h4 className="text-[12px] tracking-[0.12em] uppercase text-[#999] mb-6">
              Services
            </h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li
                  key={service}
                  className="text-[16px] text-[#1A1A1A] pb-3 border-b border-[#EDEBE7]"
                >
                  {service}
                </li>
              ))}
            </ul>
          </AnimatedSection>

          <AnimatedSection>
            <h4 className="text-[12px] tracking-[0.12em] uppercase text-[#999] mb-6">
              Select Clients
            </h4>
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {clients.map((client, i) => (
                <span key={client} className="text-[15px] text-[#888]">
                  {client}
                  {i < clients.length - 1 && ","}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
