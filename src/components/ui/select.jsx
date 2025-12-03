import React, { createContext, useContext, useState, useRef, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/components/utils"

const SelectContext = createContext({})

const Select = ({ children, value, onValueChange, defaultValue }) => {
    const [selectedValue, setSelectedValue] = useState(value || defaultValue)
    const [open, setOpen] = useState(false)

    const handleValueChange = (val) => {
        setSelectedValue(val)
        onValueChange?.(val)
        setOpen(false)
    }

    const current = value !== undefined ? value : selectedValue

    return (
        <SelectContext.Provider value={{ value: current, onValueChange: handleValueChange, open, setOpen }}>
            {children}
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useContext(SelectContext)
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, placeholder, ...props }, ref) => {
    const { value } = useContext(SelectContext)
  return (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
        {value || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
    const { open, setOpen } = useContext(SelectContext)
    const refContent = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (refContent.current && !refContent.current.contains(event.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open, setOpen])

    if (!open) return null

  return (
      <div className="relative">
    <div
      ref={(node) => {
        refContent.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
        position === "popper" && "translate-y-1",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useContext(SelectContext)
    const isSelected = selectedValue === value
  return (
    <div
      ref={ref}
      onClick={() => onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer hover:bg-accent hover:text-accent-foreground",
        isSelected ? "bg-accent text-accent-foreground" : "",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
})
SelectItem.displayName = "SelectItem"

const SelectGroup = ({children}) => <>{children}</>
const SelectLabel = ({children}) => <div className="py-1.5 pl-8 pr-2 text-sm font-semibold">{children}</div>
const SelectSeparator = () => <div className="-mx-1 my-1 h-px bg-muted" />

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator }