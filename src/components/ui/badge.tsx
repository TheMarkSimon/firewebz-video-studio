import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" | "success" | "warning" }) {
  const styles = {
    default: "bg-fw-purple/15 text-fw-purple",
    outline: "bg-fw-page text-fw-black",
    success: "bg-fw-turquoise/30 text-fw-black",
    warning: "bg-fw-yellow/40 text-fw-black",
  }[variant];
  return <div className={cn("inline-flex items-center rounded-pill px-3 py-1 font-display-medium text-xs", styles, className)} {...props} />;
}
