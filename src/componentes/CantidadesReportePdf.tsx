import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SalesByProductReport } from '../servicios/reportesServicio'

const DARK = '#1a1a2e'
const LIGHT = '#f4f4f8'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 7, padding: '16 20 14 20', color: '#111' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  subtitle: { fontSize: 7.5, color: '#666', marginBottom: 10 },
  section: { marginBottom: 12 },
  publisherName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3, backgroundColor: LIGHT, padding: '3 5' },
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
})

interface Props {
  reports: SalesByProductReport[]
  filtroEditorial: string
}

export function CantidadesReportePdf({ reports, filtroEditorial }: Props) {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.title}>Reporte: Cantidades por producto</Text>
        <Text style={s.subtitle}>
          {filtroEditorial ? `Editorial: ${filtroEditorial}` : 'Todas las editoriales'} — Generado el {fecha}
        </Text>

        {reports.map(report => (
          <View key={String(report.publisherId ?? 'all')} style={s.section}>
            <Text style={s.publisherName}>{report.publisherName}</Text>
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
                  {row.quantities.map((qty, j) => (
                    <Text key={j} style={qty === 0 ? s.td : s.tdVal}>{qty === 0 ? '—' : qty}</Text>
                  ))}
                  <Text style={s.tdTotal}>{row.totalQuantity}</Text>
                </View>
              ))}
              <View style={s.trFoot}>
                <Text style={s.tdBold}>TOTALES</Text>
                {report.productTotals.map((t, i) => (
                  <Text key={i} style={s.tdFootNum}>{t}</Text>
                ))}
                <Text style={s.tdTotal}>{report.grandTotal}</Text>
              </View>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )
}
