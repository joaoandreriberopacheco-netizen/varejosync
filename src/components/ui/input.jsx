import React from "react"
import { cn } from "@/components/utils"
import { SEARCH_INPUT_PROPS } from "@/lib/searchInputProps"
import { shouldAllowAutoFocus } from "@/lib/focusPolicy"
import {
  createUppercaseInputChangeHandler,
  UPPERCASE_SKIP_INPUT_TYPES,
} from "@/lib/uppercaseInputHandlers"

const Input = React.forwardRef(({
  className,
  type,
  inputMode,
  autoComplete,
  autoCapitalize,
  variant,
  onChange,
  autoFocus,
  ...props
}, ref) => {
  const isSearch = variant === 'search'
  const resolvedType = isSearch ? (type ?? 'search') : type
  const skipUppercase = isSearch || UPPERCASE_SKIP_INPUT_TYPES.has(resolvedType)
  // Teclado numérico nativo no mobile para campos numéricos
  const resolvedInputMode =
    inputMode ?? (isSearch ? 'search' : resolvedType === 'number' ? 'decimal' : undefined)
  const resolvedAutoCapitalize =
    autoCapitalize ?? (skipUppercase ? 'off' : 'characters')

  const handleChange = createUppercaseInputChangeHandler(onChange)

  return (
    <input
      type={resolvedType}
      inputMode={resolvedInputMode}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:max-lg:h-11 md:max-lg:px-4 md:max-lg:text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:font-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        skipUppercase ? "normal-case" : "p38-data-uppercase",
        className
      )}
      ref={ref}
      {...(isSearch ? SEARCH_INPUT_PROPS : {})}
      {...props}
      onChange={handleChange}
      autoComplete={autoComplete ?? 'off'}
      autoCapitalize={resolvedAutoCapitalize}
      autoFocus={autoFocus && shouldAllowAutoFocus()}
    />
  )
})
Input.displayName = "Input"

export { Input }