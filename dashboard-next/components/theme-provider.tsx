"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

/**
 * Tema claro/oscuro con la clase `dark` en `<html>` (tokens de shadcn en globals.css).
 * mapcn observa esa misma clase y cambia el estilo del mapa base.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props} />
  )
}
