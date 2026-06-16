import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-xl border-2 border-fw-border bg-white px-4 font-body text-[15px] text-fw-text placeholder:text-fw-lightGray focus-visible:border-fw-purple focus-visible:outline-none transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
