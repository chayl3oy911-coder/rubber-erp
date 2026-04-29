import type { LabelHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-zinc-700 dark:text-zinc-300",
        className,
      )}
      {...props}
    />
  );
}
