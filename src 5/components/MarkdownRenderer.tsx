import React, { ReactElement } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for AI chat responses
 * Handles basic markdown formatting: bold, italic, lists, line breaks
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderMarkdown = (text: string): ReactElement[] => {
    const lines = text.split('\n');
    const elements: ReactElement[] = [];
    let listItems: ReactElement[] = [];
    let listKey = 0;

    const processInlineMarkdown = (line: string): (string | ReactElement)[] => {
      const parts: (string | ReactElement)[] = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        // Match bold text: **text**
        const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
        if (boldMatch) {
          parts.push(<strong key={`bold-${key++}`}>{boldMatch[1]}</strong>);
          remaining = remaining.slice(boldMatch[0].length);
          continue;
        }

        // Match italic text: *text* (but not ** which is bold)
        const italicMatch = remaining.match(/^\*([^*]+?)\*/);
        if (italicMatch) {
          parts.push(<em key={`italic-${key++}`}>{italicMatch[1]}</em>);
          remaining = remaining.slice(italicMatch[0].length);
          continue;
        }

        // Match any other character
        const nextSpecial = remaining.search(/\*\*/);
        if (nextSpecial === -1) {
          parts.push(remaining);
          break;
        } else if (nextSpecial === 0) {
          // Just add the asterisk if no match was found
          parts.push(remaining[0]);
          remaining = remaining.slice(1);
        } else {
          parts.push(remaining.slice(0, nextSpecial));
          remaining = remaining.slice(nextSpecial);
        }
      }

      return parts;
    };

    const flushListItems = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Empty line
      if (!trimmedLine) {
        flushListItems();
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      // List item: starts with - or *
      const listMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        listItems.push(
          <li key={`li-${index}`}>
            {processInlineMarkdown(listMatch[1])}
          </li>
        );
        return;
      }

      // Regular paragraph
      flushListItems();
      elements.push(
        <p key={`p-${index}`} className="mb-2">
          {processInlineMarkdown(trimmedLine)}
        </p>
      );
    });

    // Flush any remaining list items
    flushListItems();

    return elements;
  };

  return (
    <div className={className}>
      {renderMarkdown(content)}
    </div>
  );
}
