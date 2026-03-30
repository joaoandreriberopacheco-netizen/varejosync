import React, { createContext, useContext, useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/components/utils"

const DialogContext = createContext({})

const Dialog = ({ children, open, onOpenChange }) => {
    const [internalOpen, setInternalOpen] = useState(false)
    
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen
    const setOpen = isControlled ? onOpenChange : setInternalOpen

    return (
        <DialogContext.Provider value={{ open: isOpen, setOpen }}>
            {children}
        </DialogContext.Provider>
    )
}

const DialogTrigger = ({ children, asChild, ...props }) => {
    const { setOpen } = useContext(DialogContext)
    const child = asChild ? React.Children.only(children) : children
    return React.cloneElement(child, {
        onClick: (e) => {
            child.props.onClick?.(e)
            setOpen(true)
        },
        ...props
    })
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useContext(DialogContext)
    
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black flex items-center justify-center">
            <div className="fixed inset-0" onClick={() => setOpen(false)}></div>
            <div
                ref={ref}
                className={cn(
                    "z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg bg-white dark:bg-gray-900",
                    className
                )}
                {...props}
            >
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => setOpen(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}