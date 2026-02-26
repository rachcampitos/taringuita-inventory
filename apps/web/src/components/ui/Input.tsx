"use client";

import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, className = "", id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700 dark:text-slate-300"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 text-gray-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={[
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900",
            "placeholder:text-gray-400",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            "dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500",
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-300 dark:border-red-500"
              : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-slate-600 dark:focus:border-emerald-500",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-gray-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
});
