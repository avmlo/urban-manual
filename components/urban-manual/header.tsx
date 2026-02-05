"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="w-full bg-[var(--editorial-bg)]">
      <div className="px-10 md:px-12">
        <nav
          className="flex items-center justify-between py-6 w-full"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="text-[15px] font-medium text-[var(--editorial-text-primary)] transition-opacity duration-200 hover:opacity-50"
          >
            Urban Manual<sup className="text-[10px] ml-0.5 text-[var(--editorial-text-tertiary)]">®</sup>
          </Link>

          {/* Right nav */}
          <Link
            href="/about"
            className="text-[15px] text-[var(--editorial-text-secondary)] transition-opacity duration-200 hover:opacity-50"
          >
            Information
          </Link>
        </nav>
      </div>
    </header>
  );
}
