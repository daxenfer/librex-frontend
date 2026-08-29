import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SalesByProductReport } from '../servicios/reportesServicio'

const DARK = '#1a1a2e'
const LIGHT = '#f4f4f8'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 7, padding: '16 20 14 20', color: '#111' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  subtitle: { fontSize: 7.5, color: '#666', marginBottom: 10 },
  section: { marginBottom: 12 },
  supplierName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3, backgroundColor: LIGHT, padding: '3 5' },
  table: { borderWidth: 1, borderColor: '#ccc' },
  thead: { flexDirection: 'row', backgroundColor: DARK },
  thCustomer: { paddingVertical: 3, paddingHorizontal: 4, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, width: 100 },
  th: { paddingVertical: 3, paddingHorizontal: 2, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6, flex: 1, textAlign: 'center', maxLines: 2 },
  thTotal: { paddingVertical: 3, paddingHorizontal: 4, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, width: 36, textAlign: 'center' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  trAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', backgroundColor: '#fafafa' },
  trFoot: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#aaa', backgroundColor: LIGHT },
  tdCustomer: { paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, width: 100 },
  td: { paddingVertical: 2, paddingHorizontal: 2, fontSize: 7, flex: 1, textAlign: 'center', color: '#888' },
  tdVal: { paddingVertical: 2, paddingHorizontal: 2, fontSize: 7, flex: 1, textAlign: 'center' },
  tdTotal: { paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, width: 36, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  tdBold: { paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, width: 100, fontFamily: 'Helvetica-Bold' },
  tdFootNum: { paddingVertical: 2, paddingHorizontal: 2, fontSize: 7, flex: 1, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  cell: { flex: 1, paddingVertical: 2, paddingHorizontal: 2, textAlign: 'center' },
  cellTotal: { width: 36, paddingVertical: 2, paddingHorizontal: 4, textAlign: 'center' },
  sold: { fontSize: 7, textAlign: 'center' },
  soldZero: { fontSize: 7, textAlign: 'center', color: '#888' },
  soldBold: { fontSize: 7, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  returned: { fontSize: 6, textAlign: 'center', color: '#c0392b' },
})

// Muestra vendido y, si hubo, devuelto (en rojo, con signo menos). No se netean.
function NumCell({ sold, returned, total, bold }: { sold: number; returned: number; total?: boolean; bold?: boolean }) {
  const soldStyle = bold || total ? s.soldBold : sold === 0 ? s.soldZero : s.sold
  return (
    <View style={total ? s.cellTotal : s.cell}>
      <Text style={soldStyle}>{sold === 0 && returned === 0 ? '—' : sold}</Text>
      {returned > 0 && <Text style={s.returned}>−{returned}</Text>}
    </View>
  )
}

interface Props {
  reports: SalesByProductReport[]
  filtroProveedor: string
}

export function CantidadesReportePdf({ reports, filtroProveedor }: Props) {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.title}>Reporte: Cantidades por producto</Text>
        <Text style={s.subtitle}>
          {filtroProveedor ? `Proveedor: ${filtroProveedor}` : 'Todos los proveedores'} — Generado el {fecha}
        </Text>

        {reports.map(report => (
          <View key={String(report.supplierId ?? 'all')} style={s.section}>
            <Text style={s.supplierName}>{report.supplierName}</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={s.thCustomer}>Cliente</Text>
                {report.products.map(p => (
                  <Text key={p.productId} style={s.th}>
                    {p.productName.length > 18 ? p.productName.slice(0, 17) + '…' : p.productName}
                  </Text>
                ))}
                <Text style={s.thTotal}>Total</Text>
              </View>
              {report.rows.map((row, i) => (
                <View key={row.customerId} style={i % 2 === 0 ? s.tr : s.trAlt}>
                  <Text style={s.tdCustomer}>{row.customerName}</Text>
                  {report.products.map((_, j) => (
                    <NumCell key={j} sold={row.quantitiesSold[j]} returned={row.quantitiesReturned[j]} />
                  ))}
                  <NumCell sold={row.totalSold} returned={row.totalReturned} total />
                </View>
              ))}
              <View style={s.trFoot}>
                <Text style={s.tdBold}>TOTALES</Text>
                {report.products.map((_, i) => (
                  <NumCell key={i} sold={report.productTotalsSold[i]} returned={report.productTotalsReturned[i]} bold />
                ))}
                <NumCell sold={report.grandTotalSold} returned={report.grandTotalReturned} total />
              </View>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )
}
