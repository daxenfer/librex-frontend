// Lo que comparten los encabezados de remisión, devolución y pago: los tres llevan el logo a la
// izquierda con el nombre del titular al lado, y los tres tienen el mismo problema de espacio.

import type { CompanySettingsDto } from '../servicios/settingsServicio'

// El nombre que va junto al RFC es el del titular (o la razón social), como en el formato de
// papel. El nombre comercial es solo el respaldo: el logo ya lo lleva impreso.
export function nombreEncabezado(settings: CompanySettingsDto) {
  return settings.companyName || settings.brandName
}

// El nombre se achica en vez de partirse en dos renglones.
//
// Los factores salen de medir Helvetica-Bold: "CLAUDIA VANESSA PEREZ SANCHEZ" ocupa 319pt a
// 17pt (0.647 por carácter y punto) y el mismo nombre en minúsculas solo 267 (0.542). Vale la
// pena distinguirlos: con un único factor conservador, un nombre normal se achicaba de más.
//
// `available` es el ancho en puntos que le queda al nombre una vez descontados el logo, sus
// separaciones y las cajas de la derecha. Cada documento lo calcula con su propia geometría.
export function tamanoNombre(name: string, available: number, max = 17) {
  const factor = name === name.toUpperCase() ? 0.66 : 0.56
  for (const escala of [1, 0.88, 0.76, 0.68, 0.6]) {
    const size = Math.round(max * escala * 2) / 2
    if (name.length * size * factor <= available) return size
  }
  return Math.max(8, Math.round(max * 0.6 * 2) / 2)
}
