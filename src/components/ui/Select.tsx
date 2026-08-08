import { type SelectHTMLAttributes, forwardRef } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-base text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
