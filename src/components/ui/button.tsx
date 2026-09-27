import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 lg:h-10",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "secondary" && "border bg-card hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        className
      )}
      {...props}
    />
  );
}
