import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none",
        "placeholder:text-zinc-400",
        "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500",
        className,
      )}
      {...props}
    />
  );
});
