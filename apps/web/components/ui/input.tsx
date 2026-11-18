import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border-1.5 border-line-strong bg-sheet px-3 py-2 text-[13px] text-ink shadow-inset",
        "placeholder:text-muted-foreground/80",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-ink focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-pop-sm",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
