'use client';

import React from 'react';

export interface IconProps {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Untitled UI Icon Components
 * 
 * Inline SVG components for common icons from Untitled UI.
 * These are based on the free icons available at https://www.untitledui.com/free-icons
 * 
 * To add more icons:
 * 1. Visit https://www.untitledui.com/free-icons
 * 2. Click on an icon and copy the SVG code
 * 3. Create a new component following the pattern below
 */

const baseProps = (size: number | string = 16, strokeWidth: number = 1.5) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function UtensilsIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
      <path d="M21 15v7" />
    </svg>
  );
}

export function CoffeeIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
      <path d="M6 1v3" />
      <path d="M10 1v3" />
      <path d="M14 1v3" />
    </svg>
  );
}

export function WineIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M8 22h8" />
      <path d="M7 10h10a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5Z" />
      <path d="M12 15v7" />
      <path d="M12 15a5 5 0 0 0 5-5V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a5 5 0 0 0 5 5Z" />
    </svg>
  );
}

export function Building02Icon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12h12" />
      <path d="M6 6h12" />
      <path d="M6 18h12" />
      <path d="M10 2v20" />
      <path d="M14 2v20" />
    </svg>
  );
}

export function ShoppingBagIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function CameraIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function MusicIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function FilmIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M17 3v18" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </svg>
  );
}

export function DumbbellIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6.5 6.5 11 11" />
      <path d="m11 6.5-4.5 4.5" />
      <path d="m14 16 4.5-4.5" />
      <path d="m18.5 11.5-4.5 4.5" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </svg>
  );
}

export function TreeIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M17 21v-8a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8" />
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M12 3a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
    </svg>
  );
}

export function WavesIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 8.5 5c1.2 0 1.8.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 8.5 11c1.2 0 1.8.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1C7 19 7 17 8.5 17c1.2 0 1.8.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1C7 13 7 11 8.5 11c1.2 0 1.8.5 2.5 1" />
      <path d="M13 6c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 4-2 1.2 0 1.8.5 2.5 1" />
      <path d="M13 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 4-2 1.2 0 1.8.5 2.5 1" />
      <path d="M13 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 4-2 1.2 0 1.8.5 2.5 1" />
    </svg>
  );
}

export function LandmarkIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </svg>
  );
}

export function SparklesIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

export function BreadIcon({ className = '', size = 16, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M4 10c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4v-8Z" />
      <path d="M8 6v12" />
      <path d="M12 6v12" />
      <path d="M16 6v12" />
      <path d="M6 10h12" />
      <path d="M6 14h12" />
    </svg>
  );
}

