import React from "react"
import { cn } from "@/components/utils"

const buttonVariants = ({ variant = "default", size = "default", className = "" } = {}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-gray-900 text-white shadow-sm hover:bg-primary dark:bg-white dark:text-foreground dark:hover:bg-gray-100",
    destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400",
    outline: "border border-border/40 bg-background hover:bg-muted text-foreground/90",
    secondary: "bg-muted text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600",
    ghost: "text-muted-foreground hover:bg-muted",
    link: "text-foreground/90 underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return cn(baseStyles, variants[variant], sizes[size], className);
}

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = "button"
  return (
    <Comp
      className={buttonVariants({ variant, size, className })}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }