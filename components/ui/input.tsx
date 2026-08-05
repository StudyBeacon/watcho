import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-label-secondary px-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-xl px-4 text-[15px]",
            "bg-bg-secondary text-label",
            "border border-transparent",
            "placeholder:text-label-tertiary",
            "transition-all duration-200 ease-out",
            "focus:border-accent focus:bg-bg-primary focus:outline-none",
            error && "border-error focus:border-error",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-[13px] text-error px-1">{error}</p>
        ) : hint ? (
          <p className="text-[13px] text-label-tertiary px-1">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";