"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by rendering children only after mount
  // But still render the provider for SSR
  return (
    <NextThemesProvider {...props}>
      <div 
        style={{ 
          visibility: mounted ? 'visible' : 'hidden',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.1s ease-in-out'
        }}
      >
        {children}
      </div>
    </NextThemesProvider>
  )
}
