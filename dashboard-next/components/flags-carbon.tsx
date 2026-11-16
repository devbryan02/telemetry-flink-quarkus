"use client"

import { FeatureFlags } from "@carbon/react"
import type { ReactNode } from "react"

/** Activa el comportamiento de Carbon v12 en los componentes de React (el CSS lo activa app/carbon.scss). */
export function FlagsCarbon({ children }: { children: ReactNode }) {
  return <FeatureFlags enableV12Release>{children}</FeatureFlags>
}
