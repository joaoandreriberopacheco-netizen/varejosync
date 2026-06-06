import React from "react"
import { cn } from "@/components/utils"
import { SEARCH_INPUT_PROPS } from "@/lib/searchInputProps"

const Input = React.forwardRef(({ className, type, inputMode, autoComplete, variant, ...props }, ref) => {
  const isSearch = variant === 'search'
  const resolvedType = isSearch ? (type ?? 'search') : type
  // Teclado numérico nativo no mobile para campos numéricos
  const resolvedInputMode =
    inputMode ?? (isSearch ? 'search' : resolvedType === 'number' ? 'decimal' : undefined)
  return (
    <input
      type={resolvedType}
      inputMode={resolvedInputMode}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isSearch ? "normal-case" : "p38-data-uppercase",
        className
      )}
      ref={ref}
      {...(isSearch ? SEARCH_INPUT_PROPS : {})}
      {...props}
      autoComplete={autoComplete ?? 'off'}
    />
  )
})
Input.displayName = "Input"

export { Input }