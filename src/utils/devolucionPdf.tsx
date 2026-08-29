import type { ReturnNoteDto } from '../servicios/devolucionesServicio'
import { settingsService } from '../servicios/settingsServicio'
import { customerService } from '../servicios/clientesServicio'
import { remissionService } from '../servicios/remisionesServicio'
import { printPdfBlob } from './printPdf'

// Genera el blob del PDF de una devolución (mismo comprobante que el formato físico).
// Cruza settings (logo/empresa), datos del cliente y los maestros de la remisión vinculada.
async function buildReturnNoteBlob(returnNote: ReturnNoteDto, orientation: 'landscape' | 'portrait') {
  const [settings, customer, remission, { pdf }, { DevolucionPdf }] = await Promise.all([
    settingsService.get(),
    customerService.getById(returnNote.customerId).catch(() => undefined),
    returnNote.remissionId
      ? remissionService.getById(returnNote.remissionId).catch(() => undefined)
      : Promise.resolve(undefined),
    import('@react-pdf/renderer'),
    import('../componentes/DevolucionPdf'),
  ])

  const teacherByProduct: Record<number, string> = {}
  for (const d of remission?.details ?? []) {
    if (d.teacher) teacherByProduct[d.productId] = d.teacher
  }

  return pdf(
    <DevolucionPdf returnNote={returnNote} settings={settings} customer={customer} teacherByProduct={teacherByProduct} orientation={orientation} />
  ).toBlob()
}

// Genera y descarga el PDF de una devolución (orientación horizontal).
export async function downloadReturnNotePdf(returnNote: ReturnNoteDto) {
  const blob = await buildReturnNoteBlob(returnNote, 'landscape')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `devolucion-${returnNote.folioFormatted}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Genera el PDF de una devolución y lo manda directo al diálogo de impresión (horizontal).
export async function printReturnNotePdf(returnNote: ReturnNoteDto) {
  const blob = await buildReturnNoteBlob(returnNote, 'landscape')
  printPdfBlob(blob)
}

// Igual que printReturnNotePdf pero en orientación vertical (carta portrait).
export async function printReturnNotePdfVertical(returnNote: ReturnNoteDto) {
  const blob = await buildReturnNoteBlob(returnNote, 'portrait')
  printPdfBlob(blob)
}
