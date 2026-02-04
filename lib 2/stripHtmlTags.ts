/**
 * Strips HTML tags from text content
 * Specifically removes <p> tags and their closing tags
 */
export function stripHtmlTags(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
    .replace(/<\/p>/gi, '')    // Remove closing </p> tags
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .trim();
}

