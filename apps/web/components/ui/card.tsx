import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Cards are paper tiles. `tone` picks a pastel fill for tiles that carry a
 * meaning (sage = strong, butter = caution, peach = interviewer, lavender =
 * system/report, sky = info, blush = problem). `pop` adds the hard offset shadow.
 */
const cardVariants = cva("rounded-tile border-1.5 text-ink", {
  variants: {
    tone: {
      paper: "border-ink bg-card",
      sheet: "border-line bg-sheet",
      sage: "border-ink bg-sage",
      butter: "border-ink bg-butter",
      peach: "border-ink bg-peach",
      lavender: "border-ink bg-lavender",
      sky: "border-ink bg-sky",
      blush: "border-ink bg-blush",
    },
    pop: {
      true: "shadow-pop",
      false: "shadow-card",
    },
    interactive: {
      true: "transition-[transform,box-shadow] duration-150 ease-pop hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg",
      false: "",
    },
  },
  defaultVariants: {
    tone: "paper",
    pop: false,
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, pop, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ tone, pop, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-extrabold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
