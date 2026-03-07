import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)] hover:bg-[#3D3835] dark:bg-[var(--editorial-bg)] dark:text-[var(--editorial-text-primary)] dark:hover:bg-[#E8E4DF]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[var(--editorial-border)] bg-transparent hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-primary)]",
        secondary:
          "border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]",
        ghost:
          "hover:bg-[var(--editorial-border-subtle)] text-[var(--editorial-text-primary)]",
        muted:
          "border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]",
        subtle:
          "text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]",
        pill:
          "rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] text-xs font-medium text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]",
        link: "text-[var(--editorial-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-11 gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-12 px-7 has-[>svg]:px-5",
        xs: "h-11 px-3 text-xs gap-1.5 has-[>svg]:px-2.5",
        icon: "size-11",
        "icon-sm": "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && !asChild && <Spinner />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
