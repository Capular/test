"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useCallback, useRef, useEffect, useState } from "react"
import gsap from "gsap"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // GSAP hover animation
  const handleEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { 
      scale: 1.08, 
      duration: 0.15, 
      ease: "power2.out",
      overwrite: true 
    })
  }, [])

  const handleLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { 
      scale: 1, 
      duration: 0.15, 
      ease: "power2.out",
      overwrite: true 
    })
  }, [])

  const handleClick = useCallback(() => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    
    // Animate the button on click
    if (buttonRef.current) {
      gsap.fromTo(buttonRef.current, 
        { rotate: 0 },
        { rotate: 360, duration: 0.4, ease: "power2.out" }
      )
    }
  }, [resolvedTheme, setTheme])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl"
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      className="h-9 w-9 rounded-xl will-change-transform"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
