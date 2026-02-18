"use client";

import { forwardRef, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/src/ui/button";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  id: string;
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
  className?: string;
}

export const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  function SectionContainer(
    { id, title, subtitle, onAdd, addLabel = "Add", children, className },
    ref
  ) {
    return (
      <section id={id} ref={ref} className={cn("scroll-mt-20", className)}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {onAdd && (
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              {addLabel}
            </Button>
          )}
        </div>
        {children}
      </section>
    );
  }
);
