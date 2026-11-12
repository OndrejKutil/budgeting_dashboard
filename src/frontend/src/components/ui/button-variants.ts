import { cva } from "class-variance-authority";

export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "border border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary-hover transition-colors",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-foreground/15 bg-transparent hover:border-foreground/30 hover:bg-foreground/[0.06]",
                secondary: "border border-foreground/15 bg-transparent text-foreground hover:border-foreground/30 hover:bg-foreground/[0.06]",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 px-3.5",
                lg: "h-11 px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);
