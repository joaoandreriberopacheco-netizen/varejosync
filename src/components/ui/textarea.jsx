import React from "react"
import { cn } from "@/components/utils"
import { shouldAllowAutoFocus } from "@/lib/focusPolicy"
import { createUppercaseInputChangeHandler } from "@/lib/uppercaseInputHandlers"

const Textarea = React.forwardRef(({ className, autoComplete, autoCapitalize, onChange, autoFocus, ...props }, ref) => {
  const handleChange = createUppercaseInputChangeHandler(onChange)

  return (
    <textarea
      className={cn(
        "p38-data-uppercase flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
      onChange={handleChange}
      autoComplete={autoComplete ?? 'off'}
      autoCapitalize={autoCapitalize ?? 'characters'}
      autoFocus={autoFocus && shouldAllowAutoFocus()}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }