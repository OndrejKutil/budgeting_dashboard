import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  /** Id of the control inside — the label points at it and the error id derives from it. */
  htmlFor: string;
  label: React.ReactNode;
  error?: string;
  /** Helper text under the control; hidden while an error is showing so the two never stack. */
  hint?: React.ReactNode;
  /** Rendered on the label row, right-aligned (a "Manage" link, an info tooltip, …). */
  labelAction?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + inline error. Validation problems belong next to the field they are
 * about, not in a toast that disappears while the user is still looking for the mistake.
 * Pair the control with `fieldAria(id, error)` so it gets the invalid styling and screen
 * readers announce the message.
 */
function Field({ htmlFor, label, error, hint, labelAction, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
          {label}
        </Label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Form-level error (a failed save, a server rejection). Sits inside the form so the message
 * stays visible for as long as the form does.
 */
function FormAlert({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export { Field, FormAlert };
