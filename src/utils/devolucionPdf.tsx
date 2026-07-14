import type { ReturnNoteDto } from '../servicios/devolucionesServicio'
import { settingsService } from '../servicios/settingsServicio'
import { customerService } from '../servicios/clientesServicio'
import { remissionService } from '../servicios/remisionesServicio'

// Genera y descarga el PDF de una devolución (mismo comprobante que el formato físico).
// Cruza settings (logo/empresa), datos del cliente y los maestros de la remisión vinculada.
export async function downloadReturnNotePdf(returnNote: ReturnNoteDto) {
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

  const blob = await pdf(
    <DevolucionPdf returnNote={returnNote} settings={settings} customer={customer} teacherByProduct={teacherByProduct} />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `devolucion-${returnNote.folioFormatted}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
