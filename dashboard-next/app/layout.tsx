import type { Metadata } from "next"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/600.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"

import { FlagsCarbon } from "@/components/flags-carbon"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

// Carbon primero: globals.css (Tailwind y tokens de la app) se apoya en sus variables --cds-*
// Generado por `npm run carbon:css` desde carbon.scss: Turbopack en Windows no resuelve los imports SCSS de Carbon
import "./carbon.generated.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "Telemetría de autos",
  description: "Flota en tiempo real: Kafka, Flink y Quarkus",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <FlagsCarbon>
            <TooltipProvider>{children}</TooltipProvider>
          </FlagsCarbon>
        </ThemeProvider>
      </body>
    </html>
  )
}
