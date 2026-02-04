"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-black dark:data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-800 focus-visible:border-black dark:focus-visible:border-white focus-visible:ring-black/20 dark:focus-visible:ring-white/20 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-gray-300 dark:border-gray-800 shadow-sm transition-all outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white dark:bg-gray-900 pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 shadow-sm"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
