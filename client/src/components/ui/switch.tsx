"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        /* État off : piste peu contrastée sans bordure — contour lisible sur fond sombre */
        "data-[state=unchecked]:border-white/35 data-[state=unchecked]:bg-switch-background data-[state=unchecked]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:data-[state=unchecked]:border-white/40 dark:data-[state=unchecked]:bg-input/80",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-card ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          "data-[state=unchecked]:shadow-sm data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-white/25 dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
