"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Work", href: "#work" },
  { label: "Studio", href: "#studio" },
  { label: "Notes", href: "#notes" },
  { label: "Contact", href: "#contact" },
];

export function LovablyNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="lovably-nav fixed top-0 left-0 right-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#E8E4DE]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif text-[22px] tracking-[-0.02em] text-[#1A1A1A]">
          Lovably
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] tracking-[0.08em] uppercase text-[#666] hover:text-[#1A1A1A] transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-[5px] p-2"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-[1.5px] bg-[#1A1A1A] transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-[#1A1A1A] transition-all duration-300 ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-[#1A1A1A] transition-all duration-300 ${
              mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FAF9F6] border-t border-[#E8E4DE] px-6 py-8">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] tracking-[0.06em] uppercase text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
