/**
 * Utility functions for architect pages
 */

/**
 * Convert architect name to URL-friendly slug
 * Example: "Renzo Piano" -> "renzo-piano"
 */
export function architectNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace common separators with hyphens
    .replace(/[&,]/g, '-')
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s\-]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9\-]/g, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse a design_firm string into an array of individual firm names.
 * Handles comma-separated, semicolon-separated, or mixed delimiters.
 * Examples:
 *   "andre-fu; renzo-piano-building-workshop" -> ["andre-fu", "renzo-piano-building-workshop"]
 *   "Frank Lloyd Wright, Tadao Ando" -> ["Frank Lloyd Wright", "Tadao Ando"]
 *   "Studio A; Studio B, Studio C" -> ["Studio A", "Studio B", "Studio C"]
 */
export function parseDesignFirms(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map(name => name.trim())
    .filter(Boolean);
}

/**
 * Convert slug back to display name (capitalize words)
 * Example: "renzo-piano" -> "Renzo Piano"
 */
export function slugToArchitectName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

