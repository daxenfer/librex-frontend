import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SupplierReport, UnallocatedPaymentsReport, UnlinkedReturnsReport } from '../servicios/reportesServicio'

const DARK = '#1a1a2e'
const LIGHT = '#f4f4f8'

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: '20 24 16 24', color: '#111' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#666', marginBottom: 12 },
  section: { marginBottom: 14 },
  supplierName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4, backgroundColor: LIGHT, padding: '4 6' },
  table: { borderWidth: 1, borderColor: '#ccc' },
  thead: { flexDirection: 'row', backgroundColor: DARK },
  th: { paddingVertical: 4, paddingHorizontal: 6, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7, flex: 1 },
  thRight: { paddingVertical: 4, paddingHorizontal: 6, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7, flex: 1, textAlign: 'right' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  trAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', backgroundColor: '#fafafa' },
  trFoot: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#aaa', backgroundColor: LIGHT },
  td: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1 },
  tdRight: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1, textAlign: 'right' },
  tdBold: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1, fontFamily: 'Helvetica-Bold' },
  tdRightBold: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdRed: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1, textAlign: 'right', color: '#c0392b', fontFamily: 'Helvetica-Bold' },
  tdGreen: { paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, flex: 1, textAlign: 'right', color: '#27ae60', fontFamily: 'Helvetica-Bold' },
})

interface Props {
  reports: SupplierReport[]
  filtroProveedor: string
  unallocated?: UnallocatedPaymentsReport
  unlinkedReturns?: UnlinkedReturnsReport
}

export function SaldosReportePdf({ reports, filtroProveedor, unallocated, unlinkedReturns }: Props) {
  const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Reporte: Saldos por cliente</Text>
        <Text style={s.subtitle}>
          {filtroProveedor ? `Proveedor: ${filtroProveedor}` : 'Todos los proveedores'} — Generado el {fecha}
        </Text>

        {reports.map(report => (
          <View key={String(report.supplierId ?? 'all')} style={s.section}>
            <Text style={s.supplierName}>{report.supplierName}</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={s.th}>Cliente</Text>
                <Text style={s.thRight}>Ventas</Text>
                <Text style={s.thRight}>Devoluciones</Text>
                <Text style={s.thRight}>Pagos</Text>
                <Text style={s.thRight}>Saldo</Text>
              </View>
              {report.customers.map((row, i) => (
                <View key={row.customerId} style={i % 2 === 0 ? s.tr : s.trAlt}>
                  <Text style={s.td}>{row.customerName}</Text>
                  <Text style={s.tdRight}>{fmt(row.totalSales)}</Text>
                  <Text style={s.tdRight}>{fmt(row.totalReturns)}</Text>
                  <Text style={s.tdRight}>{fmt(row.totalPayments)}</Text>
                  <Text style={row.balance > 0 ? s.tdRed : row.balance < 0 ? s.tdGreen : s.tdRight}>
                    {fmt(row.balance)}
                  </Text>
                </View>
              ))}
              <View style={s.trFoot}>
                <Text style={s.tdBold}>TOTALES</Text>
                <Text style={s.tdRightBold}>{fmt(report.totals.totalSales)}</Text>
                <Text style={s.tdRightBold}>{fmt(report.totals.totalReturns)}</Text>
                <Text style={s.tdRightBold}>{fmt(report.totals.totalPayments)}</Text>
                <Text style={report.totals.balance > 0 ? s.tdRed : report.totals.balance < 0 ? s.tdGreen : s.tdRightBold}>
                  {fmt(report.totals.balance)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {unlinkedReturns && unlinkedReturns.rows.length > 0 && (
          <View style={s.section}>
            <Text style={s.supplierName}>Devoluciones sin remision</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={s.th}>Cliente</Text>
                <Text style={s.thRight}>Notas</Text>
                <Text style={s.thRight}>Importe</Text>
              </View>
              {unlinkedReturns.rows.map((row, i) => (
                <View key={row.customerId} style={i % 2 === 0 ? s.tr : s.trAlt}>
                  <Text style={s.td}>{row.customerName}</Text>
                  <Text style={s.tdRight}>{String(row.noteCount)}</Text>
                  <Text style={s.tdRightBold}>{fmt(row.unlinkedAmount)}</Text>
                </View>
              ))}
              <View style={s.trFoot}>
                <Text style={s.tdBold}>TOTAL</Text>
                <Text style={s.tdRight} />
                <Text style={s.tdRightBold}>{fmt(unlinkedReturns.totalUnlinked)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 6.5, color: '#888', marginTop: 4 }}>
              Sin remision no hay venta a la cual atribuirlas: no se restan del saldo de ningun proveedor.
            </Text>
          </View>
        )}

        {unallocated && unallocated.rows.length > 0 && (
          <View style={s.section}>
            <Text style={s.supplierName}>Pagos sin asignar (anticipos)</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={s.th}>Cliente</Text>
                <Text style={s.thRight}>Pagos totales</Text>
                <Text style={s.thRight}>Aplicado</Text>
                <Text style={s.thRight}>Sin asignar</Text>
              </View>
              {unallocated.rows.map((row, i) => (
                <View key={row.customerId} style={i % 2 === 0 ? s.tr : s.trAlt}>
                  <Text style={s.td}>{row.customerName}</Text>
                  <Text style={s.tdRight}>{fmt(row.totalPayments)}</Text>
                  <Text style={s.tdRight}>{fmt(row.allocatedAmount)}</Text>
                  <Text style={s.tdRightBold}>{fmt(row.unallocatedAmount)}</Text>
                </View>
              ))}
              <View style={s.trFoot}>
                <Text style={s.tdBold}>TOTAL</Text>
                <Text style={s.tdRight} />
                <Text style={s.tdRight} />
                <Text style={s.tdRightBold}>{fmt(unallocated.totalUnallocated)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 6.5, color: '#888', marginTop: 4 }}>
              Estos montos no son atribuibles a ningun proveedor hasta que se apliquen a remisiones.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
