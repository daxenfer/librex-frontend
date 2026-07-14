// Fechas de captura (solo día, sin hora). Se guardan como mediodía UTC para que
// al renderizarlas en cualquier zona horaria (±12h) caigan en el mismo día calendario.
// Nunca usar new Date('YYYY-MM-DD').toISOString(): parsea como medianoche UTC y en
// México (UTC-6) se muestra el día anterior.

/** 'YYYY-MM-DD' de hoy en hora local (no UTC). */
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' -> ISO a mediodía UTC, para enviar al API. */
export const toUtcNoon = (dateStr: string) => dateStr + 'T12:00:00.000Z'
