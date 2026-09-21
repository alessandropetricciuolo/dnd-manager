import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-crimson-base text-parchment-100 hover:bg-crimson-hover shadow-sm border border-crimson-base/80 active:scale-[0.98] transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-brass-base/40 text-brass-base bg-guild-stone/60 hover:bg-brass-base/15 hover:border-brass-base/70 transition-all",
        secondary:
          "bg-brass-base text-guild-void font-semibold hover:bg-brass-base/90 shadow-sm transition-all",
        ghost: "hover:bg-guild-oak hover:text-brass-base text-parchment-300 transition-colors",
        link: "text-brass-base underline-offset-4 hover:underline",
        wax: "btn-wax-seal text-parchment-100 font-semibold tracking-wide",
        stone: "bg-guild-oak border border-guild-border text-parchment-100 hover:bg-guild-oak-highlight hover:border-guild-border-light transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
