import * as React from "react"
import { TABLET_MIN } from "@/hooks/use-breakpoint"

/** Smartphone (<768px). Para tablet/desktop use `useBreakpoint` / `useIsDesktop`. */
const PHONE_BREAKPOINT = TABLET_MIN

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < PHONE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < PHONE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
