import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700",
  secondary:
    "bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700 active:bg-slate-600",
  danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
  ghost: "bg-transparent text-blue-400 hover:bg-slate-800 active:bg-slate-700",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 h-11 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          variantClasses[variant]
        } ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
