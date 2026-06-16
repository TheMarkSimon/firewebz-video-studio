import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full rounded-xl border-2 border-fw-border bg-white px-4 py-3 font-body text-[15px] text-fw-text placeholder:text-fw-lightGray focus-visible:border-fw-purple focus-visible:outline-none transition-colors",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
