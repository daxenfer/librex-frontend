import type { RemissionDto } from '../servicios/remisionesServicio'
import { remissionService } from '../servicios/remisionesServicio'
import { settingsService } from '../servicios/settingsServicio'
import { printPdfBlob } from './printPdf'

// Genera el blob del PDF de una remisión. Refresca el registro completo con getById para
// asegurar que trae `details` (el endpoint de lista podría no poblarlos) y arma el mapa
// productId → ISBN con los datos del propio documento. El catálogo no sirve aquí: no lista
// productos eliminados, y una remisión ya emitida debe imprimirse igual aunque su producto
// se haya dado de baja después.
async function buildRemissionBlob(remission: RemissionDto, orientation: 'landscape' | 'portrait') {
  const [settings, full, { pdf }, { RemisionPdf }] = await Promise.all([
    settingsService.get(),
    remissionService.getById(remission.id).catch(() => remission),
    import('@react-pdf/renderer'),
    import('../componentes/RemisionPdf'),
  ])

  const isbnByProductId: Record<number, string> = {}
  for (const d of full.details) if (d.isbn) isbnByProductId[d.productId] = d.isbn

  return pdf(
    <RemisionPdf remission={full} settings={settings} isbnByProductId={isbnByProductId} orientation={orientation} />
  ).toBlob()
}

// Genera y descarga el PDF de una remisión (orientación horizontal).
export async function downloadRemissionPdf(remission: RemissionDto) {
  const blob = await buildRemissionBlob(remission, 'landscape')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `remision-${remission.folioFormatted}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Genera el PDF de una remisión y lo manda directo al diálogo de impresión (horizontal).
export async function printRemissionPdf(remission: RemissionDto) {
  const blob = await buildRemissionBlob(remission, 'landscape')
  printPdfBlob(blob)
}

// Igual que printRemissionPdf pero en orientación vertical (carta portrait).
export async function printRemissionPdfVertical(remission: RemissionDto) {
  const blob = await buildRemissionBlob(remission, 'portrait')
  printPdfBlob(blob)
}
