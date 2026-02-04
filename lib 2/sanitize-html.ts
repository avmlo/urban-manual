import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify with a whitelist of safe tags.
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML safe for rendering
 * 
 * @example
 * ```ts
 * const safe = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
 * // Returns: '<p>Hello</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'blockquote', 'code', 'pre', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  });
}

/**
 * Sanitizes HTML and strips all tags, returning plain text.
 * Use for search results, previews, or meta descriptions.
 */
export function sanitizeToPlainText(html: string): string {
  if (!html) return '';
  
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  return sanitized.trim();
}

