"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/src/ui/input";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export function InlineEdit({
  value,
  onSave,
  placeholder = "Click to edit",
  className,
  inputClassName,
  as: Tag = "span",
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(() => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  }, [draft, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setDraft(value);
        setEditing(false);
      }
    },
    [handleSave, value]
  );

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("bg-transparent border-gray-300", inputClassName)}
      />
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer group inline-flex items-center gap-2 hover:opacity-80 transition-opacity",
        !value && "text-gray-400 italic",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
    >
      {value || placeholder}
      <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </Tag>
  );
}
