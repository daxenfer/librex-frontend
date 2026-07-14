import type { PaymentDto } from '../servicios/pagosServicio'
import { settingsService } from '../servicios/settingsServicio'
import { printPdfBlob } from './printPdf'

// Genera el blob del PDF del recibo de pago (siempre vertical, carta portrait).
async function buildPaymentBlob(payment: PaymentDto) {
  const [settings, { pdf }, { PagoPdf }] = await Promise.all([
    settingsService.get(),
    import('@react-pdf/renderer'),
    import('../componentes/PagoPdf'),
  ])
  return pdf(<PagoPdf payment={payment} settings={settings} />).toBlob()
}

// Genera y descarga el PDF del recibo.
export async function downloadPaymentPdf(payment: PaymentDto) {
  const blob = await buildPaymentBlob(payment)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recibo-${payment.folioFormatted}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Genera el PDF del recibo y lo manda directo al diálogo de impresión del navegador.
export async function printPaymentPdf(payment: PaymentDto) {
  const blob = await buildPaymentBlob(payment)
  printPdfBlob(blob)
}
