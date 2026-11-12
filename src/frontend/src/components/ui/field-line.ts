/**
 * The "label over a line" look shared by Input, Textarea, SelectTrigger and the button-like
 * controls built on top of them (date picker trigger, tag field). No box, no background:
 * a 1px bottom line that brightens on hover, turns amber on keyboard focus (drawn as a 2px
 * line with a box-shadow so nothing shifts) and red when `aria-invalid`.
 */
export const fieldLine =
  'rounded-none border-0 border-b border-foreground/25 bg-transparent px-0 hover:border-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_1px_0_0_hsl(var(--primary))] aria-[invalid=true]:border-destructive aria-[invalid=true]:shadow-[0_1px_0_0_hsl(var(--destructive))] disabled:cursor-not-allowed disabled:opacity-50';
