"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

/**
 * Tema claro/oscuro con la clase `dark` en `<html>`. Carbon (app/carbon.scss) cambia de White a G100 con
 * esa clase, los tokens de globals.css la siguen y mapcn la observa para cambiar el mapa base.
 */

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props} />
  )
}
