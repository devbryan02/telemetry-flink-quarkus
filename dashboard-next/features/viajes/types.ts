/** Contrato de GET /viajes (persistencia). Copia propia de la feature. */
export type EstadoViaje = "SIN_CIERRE" | "FINALIZADO" | "DETENIDO" | "REEMPLAZADO"
export type ViajeVista = { viajeId: string; carreraId: string | null; carId: string; rutaId: string; companyId: string | null; fleetId: string | null; inicioViajeTs: number; finTs: number | null; estado: EstadoViaje; motivoFin: string | null; ultimoTs: number }
export type ResumenViaje = { cantidadMuestras: number; ultimoTs: number; duracionObservadaMs: number; duracionViajeMs: number | null; distanciaObservadaM: number; velocidadMediaObservadaKmh: number | null; maxIntervaloMuestrasMs: number }
export type ViajeDetalle = { viaje: ViajeVista; resumen: ResumenViaje }
export type PosicionVista = { eventId: string; viajeId: string; tipoEvento: string; receivedAt: string; carId: string; companyId: string | null; fleetId: string | null; lat: number; lon: number; heading: number; engine: string; battery: number; ts: number }
export type Pagina<T> = { items: T[]; nextCursor: string | null }

export type ResumenRuta = { id: string; nombre: string; desde: string; hasta: string; km: number }
export type GeometriaRuta = { features: { geometry: { coordinates: [number, number][] } }[] }
