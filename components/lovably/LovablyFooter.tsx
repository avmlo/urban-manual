"use client";

export function LovablyFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="px-6 md:px-12 py-12 md:py-16 max-w-[1400px] mx-auto border-t border-[#E8E4DE]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        {/* Left - Tagline */}
        <div>
          <p className="font-serif italic text-[18px] text-[#999] mb-4">
            With love from New York City
          </p>
          <p className="text-[13px] text-[#BBB]">
            &copy; {currentYear} Lovably. All rights reserved.
          </p>
        </div>

        {/* Right - Links */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <a
            href="mailto:hello@lovably.com"
            className="text-[13px] tracking-[0.04em] text-[#888] hover:text-[#1A1A1A] transition-colors duration-300"
          >
            hello@lovably.com
          </a>
          <a
            href="https://instagram.com/lovably"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] tracking-[0.04em] text-[#888] hover:text-[#1A1A1A] transition-colors duration-300"
          >
            Instagram
          </a>
          <a
            href="https://linkedin.com/company/lovably"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] tracking-[0.04em] text-[#888] hover:text-[#1A1A1A] transition-colors duration-300"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
