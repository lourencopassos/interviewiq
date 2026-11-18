import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Pill badges with an ink border, like the reference's "Intermediate" / "12 steps" chips. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-1.5 px-2.5 py-0.5 text-[11px] font-semibold leading-5 transition-colors",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-paper",
        outline: "border-ink bg-transparent text-ink",
        secondary: "border-line-strong bg-sheet text-ink-2",
        sage: "border-ink bg-sage text-sage-deep",
        butter: "border-ink bg-butter text-butter-deep",
        peach: "border-ink bg-peach text-peach-deep",
        lavender: "border-ink bg-lavender text-lavender-deep",
        sky: "border-ink bg-sky text-sky-deep",
        blush: "border-ink bg-blush text-blush-deep",
        destructive: "border-ink bg-blush text-blush-deep",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
