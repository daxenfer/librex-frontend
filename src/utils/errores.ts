// El backend responde errores en dos formas distintas: `{ error }` cuando una regla de negocio
// truena dentro de un servicio (lo traduce ErrorLoggingMiddleware) y ValidationProblemDetails
// cuando falla la validación del DTO en [ApiController]. Esta función lee ambas, para que el
// motivo real llegue al usuario en vez de un mensaje genérico.
export function errorMessage(err: unknown, fallback = 'No se pudo completar la operación.'): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== 'object') return fallback

  const withError = data as { error?: string }
  if (typeof withError.error === 'string' && withError.error) return withError.error

  const problem = data as { errors?: Record<string, string[]>; title?: string }
  const firstFieldError = problem.errors && Object.values(problem.errors).flat().find(Boolean)
  return firstFieldError ?? problem.title ?? fallback
}
