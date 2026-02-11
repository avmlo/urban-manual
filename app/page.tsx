import { Metadata } from "next";
import { LovablyHome } from "@/components/lovably/LovablyHome";

export const metadata: Metadata = {
  title: "Lovably — Independent Design Studio, New York City",
  description:
    "Lovably is an independent branding, print, and web design studio in New York City, shaping sophisticated brands with optimism and precision.",
  openGraph: {
    title: "Lovably — Independent Design Studio, New York City",
    description:
      "Lovably is an independent branding, print, and web design studio in New York City, shaping sophisticated brands with optimism and precision.",
    url: "https://www.lovably.com",
    siteName: "Lovably",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lovably — Independent Design Studio, New York City",
    description:
      "Lovably is an independent branding, print, and web design studio in New York City, shaping sophisticated brands with optimism and precision.",
  },
};

export default function HomePage() {
  return <LovablyHome />;
}
