import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons are ink-bordered tiles with a hard offset shadow. Hover lifts them
 * one pixel toward the light; pressing drops them onto their shadow.
 */
const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border-1.5 font-semibold",
    "transition-[transform,box-shadow,background-color,color] duration-150 ease-pop",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Ink fill — the one primary action on a screen. */
        default:
          "border-ink bg-ink text-paper shadow-pop hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-[2px] active:translate-y-[3px] active:shadow-pop-none",
        /** Sage tile — a positive, forward action (start, record, next). */
        accent:
          "border-ink bg-sage text-sage-deep shadow-pop hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-[2px] active:translate-y-[3px] active:shadow-pop-none",
        /** Paper tile with ink border. */
        outline:
          "border-ink bg-card text-ink shadow-pop-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-[1.5px] active:translate-y-[2px] active:shadow-pop-none",
        /** Quiet paper tile, soft border, no pop. */
        secondary:
          "border-line-strong bg-sheet text-ink hover:border-ink hover:bg-card",
        destructive:
          "border-ink bg-blush text-blush-deep shadow-pop-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-pop active:translate-x-[1.5px] active:translate-y-[2px] active:shadow-pop-none",
        ghost: "border-transparent text-ink-2 hover:border-line hover:bg-sheet hover:text-ink",
        link: "border-transparent text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink",
      },
      size: {
        default: "h-10 px-4 text-[13px]",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 px-6 text-sm",
        xl: "h-14 px-8 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
