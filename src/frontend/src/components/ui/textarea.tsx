import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldLine } from "./field-line";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[5rem] w-full py-2 text-base transition-colors placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/80 md:text-[0.9375rem]",
        fieldLine,
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
