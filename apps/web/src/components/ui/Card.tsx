import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", className = "", children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={[
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        "dark:border-slate-700 dark:bg-slate-800",
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className = "", children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={[
          "flex items-center justify-between border-b border-gray-200 px-5 py-4",
          "dark:border-slate-700",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  function CardBody({ className = "", children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={["p-5", className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className = "", children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={[
          "flex items-center border-t border-gray-200 px-5 py-4",
          "dark:border-slate-700",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);
