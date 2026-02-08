'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Minus, Link2, ImageIcon,
  Heading2, Heading3, Heading4, Undo, Redo, Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Show character count */
  showCharCount?: boolean;
  /** Minimum height in pixels */
  minHeight?: number;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        isActive
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  showCharCount = true,
  minHeight = 200,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm' } },
        blockquote: { HTMLAttributes: { class: 'border-l-2 border-gray-300 dark:border-gray-600 pl-4 italic' } },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer' },
      }),
      ImageExtension.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}px`,
      },
      handlePaste: (view, event) => {
        // Strip formatting from pasted content from Word/Google Docs
        const html = event.clipboardData?.getData('text/html');
        if (html) {
          // Let TipTap handle it — it strips unsupported formatting
          return false;
        }
        return false;
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // Only sync when content prop changes externally (not from our own onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const iconSize = 15;

  return (
    <div className={cn("border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} isActive={editor.isActive('heading', { level: 4 })} title="Heading 4">
          <Heading4 size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Cmd+B)">
          <Bold size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Cmd+I)">
          <Italic size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Cmd+U)">
          <UnderlineIcon size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
          <List size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
          <Code size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus size={iconSize} />
        </ToolbarButton>

        <ToolbarDivider />

        <div className="relative">
          <ToolbarButton
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
                setTimeout(() => linkInputRef.current?.focus(), 100);
              }
            }}
            isActive={editor.isActive('link')}
            title={editor.isActive('link') ? 'Remove link' : 'Add link'}
          >
            {editor.isActive('link') ? <Unlink size={iconSize} /> : <Link2 size={iconSize} />}
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1.5">
              <input
                ref={linkInputRef}
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setLink(); } if (e.key === 'Escape') setShowLinkInput(false); }}
                placeholder="https://..."
                className="w-56 px-2 py-1 text-sm bg-transparent border-none focus:outline-none"
              />
              <button type="button" onClick={setLink} className="px-2 py-1 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded">
                Add
              </button>
            </div>
          )}
        </div>

        <ToolbarButton onClick={addImage} title="Insert Image">
          <ImageIcon size={iconSize} />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Cmd+Z)">
          <Undo size={iconSize} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Cmd+Shift+Z)">
          <Redo size={iconSize} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Character count */}
      {showCharCount && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800/50 text-right">
          <span className="text-xs text-gray-400">
            {editor.storage.characterCount.characters()} characters
          </span>
        </div>
      )}
    </div>
  );
}
