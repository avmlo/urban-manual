'use client';

import React from 'react';

interface UntitledUIIconProps {
  name: string;
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Untitled UI Icon Component
 * 
 * Renders SVG icons from Untitled UI icon library.
 * 
 * To use:
 * 1. Download icons from https://www.untitledui.com/free-icons
 * 2. Place SVG files in public/icons/untitled-ui/ directory
 * 3. Use icon name (without .svg extension) as the `name` prop
 * 
 * Example:
 * <UntitledUIIcon name="utensils" className="w-4 h-4" />
 */
export function UntitledUIIcon({ 
  name, 
  className = '', 
  size = 16,
  strokeWidth = 1.5 
}: UntitledUIIconProps) {
  const [svgContent, setSvgContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Load SVG from public directory
    fetch(`/icons/untitled-ui/${name}.svg`)
      .then(res => {
        if (!res.ok) throw new Error('Icon not found');
        return res.text();
      })
      .then(svg => {
        // Parse and modify SVG to accept className and size
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        
        if (svgElement) {
          // Set attributes
          svgElement.setAttribute('width', typeof size === 'number' ? `${size}` : size);
          svgElement.setAttribute('height', typeof size === 'number' ? `${size}` : size);
          svgElement.setAttribute('class', className);
          svgElement.setAttribute('stroke-width', strokeWidth.toString());
          
          // Make stroke and fill currentColor for theming
          svgElement.setAttribute('stroke', 'currentColor');
          svgElement.setAttribute('fill', 'none');
          
          setSvgContent(svgElement.outerHTML);
        }
      })
      .catch(() => {
        setError(true);
      });
  }, [name, className, size, strokeWidth]);

  if (error) {
    // Fallback: return a simple placeholder
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  if (!svgContent) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: svgContent }} />;
}

