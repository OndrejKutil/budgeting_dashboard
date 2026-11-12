import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldLine } from "./field-line";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full py-2 text-base transition-colors placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/80 md:text-[15px]",
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
