import type { RemissionDto } from '../servicios/remisionesServicio'
import { remissionService } from '../servicios/remisionesServicio'
import { productService } from '../servicios/productosServicio'
import { settingsService } from '../servicios/settingsServicio'
import { printPdfBlob } from './printPdf'

// Genera el blob del PDF de una remisión. Refresca el registro completo con getById
// para asegurar que trae `details` (el endpoint de lista podría no poblarlos) y arma
// el mapa productId → ISBN a partir del catálogo de productos.
async function buildRemissionBlob(remission: RemissionDto, orientation: 'landscape' | 'portrait') {
  const [settings, full, products, { pdf }, { RemisionPdf }] = await Promise.all([
    settingsService.get(),
    remissionService.getById(remission.id).catch(() => remission),
    productService.getAll().catch(() => []),
    import('@react-pdf/renderer'),
    import('../componentes/RemisionPdf'),
  ])

  const isbnByProductId: Record<number, string> = {}
  for (const p of products) if (p.isbn) isbnByProductId[p.id] = p.isbn

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
