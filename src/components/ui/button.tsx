"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fw-purple/40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-fw-purple text-white rounded-pill hover:bg-fw-purpleDark disabled:bg-fw-disabled disabled:text-fw-lightGray",
        outline: "border-2 border-fw-purple bg-white text-fw-purple rounded-pill hover:bg-fw-purpleSoft",
        ghost: "text-fw-text hover:bg-fw-purpleSoft rounded-pill",
        link: "text-fw-purple underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground rounded-pill",
      },
      size: {
        default: "h-11 px-8 text-[14px]",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-10 text-[15px]",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
