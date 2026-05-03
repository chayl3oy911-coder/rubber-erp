import {
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { cn } from "@/shared/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", onKeyDown, ...props },
  ref,
) {
  // Block ↑/↓ from changing the value on number inputs. Typing/deleting still work.
  // The user-supplied onKeyDown is still invoked so callers keep full control.
  const handleKeyDown =
    type === "number"
      ? (event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
          }
          onKeyDown?.(event);
        }
      : onKeyDown;

  return (
    <input
      ref={ref}
      type={type}
      onKeyDown={handleKeyDown}
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
