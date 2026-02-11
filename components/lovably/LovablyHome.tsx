"use client";

import { LovablyNav } from "./LovablyNav";
import { LovablyHero } from "./LovablyHero";
import { LovablyWork } from "./LovablyWork";
import { LovablyStudio } from "./LovablyStudio";
import { LovablyNotes } from "./LovablyNotes";
import { LovablyNewsletter } from "./LovablyNewsletter";
import { LovablyContact } from "./LovablyContact";
import { LovablyFooter } from "./LovablyFooter";

export function LovablyHome() {
  return (
    <div className="lovably-page bg-[#FAF9F6] text-[#1A1A1A] min-h-screen -mt-[1px]">
      <LovablyNav />
      <LovablyHero />
      <LovablyWork />
      <LovablyStudio />
      <LovablyNotes />
      <LovablyNewsletter />
      <LovablyContact />
      <LovablyFooter />
    </div>
  );
}
