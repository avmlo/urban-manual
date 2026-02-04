import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleGroupVariants>
>(({ className, variant, size, spacing, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(toggleGroupVariants({ variant, size, spacing }), className)}
    {...props}
  />
))
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const toggleGroupVariants = cva(
  "inline-flex items-center justify-center rounded-2xl",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-gray-200 dark:border-gray-800",
      },
      size: {
        default: "h-auto",
        sm: "h-auto text-xs",
        lg: "h-auto text-base",
      },
      spacing: {
        0: "gap-0",
        1: "gap-1",
        2: "gap-2",
        3: "gap-3",
        4: "gap-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      spacing: 0,
    },
  }
)

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-black dark:data-[state=on]:bg-white data-[state=on]:text-white dark:data-[state=on]:text-black data-[state=off]:border data-[state=off]:border-gray-200 dark:data-[state=off]:border-gray-800 data-[state=off]:hover:bg-gray-50 dark:data-[state=off]:hover:bg-gray-900",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-gray-200 dark:border-gray-800",
      },
      size: {
        default: "px-4 py-2",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleGroupItemVariants>
>(({ className, variant, size, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(toggleGroupItemVariants({ variant, size }), className)}
    {...props}
  />
))
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem, toggleGroupVariants, toggleGroupItemVariants }

