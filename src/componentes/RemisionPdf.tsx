import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RemissionDto } from '../servicios/remisionesServicio'

const BLUE = '#003087'
const BLUE_LIGHT = '#e6edf8'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: '18 24 14 24', color: '#111' },

  // ── Header ──────────────────────────────────────────────────────────
  header: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 7, borderBottom: `2.5px solid ${BLUE}`, paddingBottom: 7 },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 1 },
  companyTagline: { fontSize: 7, color: '#555', marginTop: 2 },

  metaStack: { flexDirection: 'row', gap: 5, alignItems: 'stretch' },
  metaBox: { borderWidth: 1, borderColor: BLUE, padding: '3 7', minWidth: 95, justifyContent: 'space-between' },
  metaLabel: { fontSize: 6, color: BLUE, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  metaValue: { fontSize: 8.5 },

  folioBox: { backgroundColor: BLUE, padding: '5 12', alignItems: 'center', justifyContent: 'center', minWidth: 110 },
  folioTag: { fontSize: 7, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 3 },
  folioNum: { fontSize: 20, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },

  // ── Client row ──────────────────────────────────────────────────────
  clientRow: { flexDirection: 'row', gap: 0, marginBottom: 5 },

  // ── Labeled field (blue header bar + white body) ─────────────────────
  lf: { flex: 1, flexDirection: 'column', borderWidth: 1, borderColor: BLUE, marginRight: 3 },
  lfLabel: { backgroundColor: BLUE, paddingVertical: 2, paddingHorizontal: 4, fontSize: 6, color: '#fff', fontFamily: 'Helvetica-Bold' },
  lfValue: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 8, minHeight: 16 },

  // ── Table ────────────────────────────────────────────────────────────
  table: { borderWidth: 1.5, borderColor: BLUE, marginBottom: 5 },
  thead: { flexDirection: 'row', backgroundColor: BLUE },
  th: { paddingVertical: 3, paddingHorizontal: 4, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7, borderRightWidth: 0.5, borderRightColor: 'rgba(255,255,255,0.35)' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#c8d4e8' },
  trAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#c8d4e8', backgroundColor: BLUE_LIGHT },
  td: { paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 7.5, borderRightWidth: 0.5, borderRightColor: '#c8d4e8' },

  // Columns
  cEd: { width: '17%' },
  cTi: { flex: 1 },
  cCi: { width: '10%' },
  cQt: { width: '8%', textAlign: 'right' },
  cPu: { width: '10%', textAlign: 'right' },
  cIm: { width: '10%', textAlign: 'right', borderRightWidth: 0 },

  // ── Totals ───────────────────────────────────────────────────────────
  totalsBlock: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  totalRow: { flexDirection: 'row', marginBottom: 2 },
  tLabel: { backgroundColor: BLUE, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 8, width: 80, textAlign: 'right' },
  tValue: { borderWidth: 1, borderColor: BLUE, fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 8, width: 80, textAlign: 'right' },
  tValueTotal: { borderWidth: 2, borderColor: BLUE, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE, paddingVertical: 3, paddingHorizontal: 8, width: 80, textAlign: 'right' },

  // ── Footer ───────────────────────────────────────────────────────────
  footer: { flexDirection: 'row', alignItems: 'flex-end' },
  obsBox: { flex: 1, borderWidth: 1, borderColor: BLUE, padding: '4 6', minHeight: 44, marginRight: 20 },
  obsLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4 },
  signBlock: { width: 190, alignItems: 'center' },
  signLine: { borderTopWidth: 1.5, borderTopColor: BLUE, width: '100%', paddingTop: 3, textAlign: 'center', fontSize: 7, color: BLUE, fontFamily: 'Helvetica-Bold' },
})

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

const MIN_ROWS = 14

interface Props { remission: RemissionDto }

export function RemisionPdf({ remission }: Props) {
  const dateStr = new Date(remission.date)
    .toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const emptyRows = Math.max(0, MIN_ROWS - remission.details.length)

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>Librex</Text>
            <Text style={s.companyTagline}>Distribución de libros</Text>
          </View>
          <View style={s.metaStack}>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>VENDEDOR</Text>
              <Text style={s.metaValue}>{remission.salesPerson ?? ''}</Text>
            </View>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>FECHA</Text>
              <Text style={s.metaValue}>{dateStr}</Text>
            </View>
            <View style={s.folioBox}>
              <Text style={s.folioTag}>REMISIÓN</Text>
              <Text style={s.folioNum}>N° {remission.folioFormatted}</Text>
            </View>
          </View>
        </View>

        {/* ── CLIENT ── */}
        <View style={s.clientRow}>
          <View style={[s.lf, { flex: 3, marginRight: 3 }]}>
            <Text style={s.lfLabel}>CLIENTE</Text>
            <Text style={s.lfValue}>{remission.customerName}</Text>
          </View>
          <View style={[s.lf, { flex: 1, marginRight: 3 }]}>
            <Text style={s.lfLabel}>MAESTRO</Text>
            <Text style={s.lfValue}>{String(remission.customerId).padStart(6, '0')}</Text>
          </View>
          <View style={[s.lf, { flex: 4, marginRight: 3 }]}>
            <Text style={s.lfLabel}>DOMICILIO</Text>
            <Text style={s.lfValue}> </Text>
          </View>
          <View style={[s.lf, { flex: 1, marginRight: 3 }]}>
            <Text style={s.lfLabel}>C.P.</Text>
            <Text style={s.lfValue}> </Text>
          </View>
          <View style={[s.lf, { flex: 1.5, marginRight: 0 }]}>
            <Text style={s.lfLabel}>TEL.</Text>
            <Text style={s.lfValue}> </Text>
          </View>
        </View>

        {/* ── TABLE ── */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cEd]}>EDITORIAL</Text>
            <Text style={[s.th, s.cTi]}>TÍTULO</Text>
            <Text style={[s.th, s.cCi]}>CIUDAD</Text>
            <Text style={[s.th, s.cQt]}>CANTIDAD</Text>
            <Text style={[s.th, s.cPu]}>P. UNITARIO</Text>
            <Text style={[s.th, s.cIm]}>IMPORTE</Text>
          </View>
          {remission.details.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
              <Text style={[s.td, s.cEd]}>{d.publisherName ?? ''}</Text>
              <Text style={[s.td, s.cTi]}>{d.productName}</Text>
              <Text style={[s.td, s.cCi]}>{d.city ?? ''}</Text>
              <Text style={[s.td, s.cQt]}>{d.quantity}</Text>
              <Text style={[s.td, s.cPu]}>{fmt(d.unitPrice)}</Text>
              <Text style={[s.td, s.cIm]}>{fmt(d.amount)}</Text>
            </View>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => {
            const idx = remission.details.length + i
            return (
              <View key={`e${i}`} style={idx % 2 === 0 ? s.tr : s.trAlt}>
                <Text style={[s.td, s.cEd]}> </Text>
                <Text style={[s.td, s.cTi]}> </Text>
                <Text style={[s.td, s.cCi]}> </Text>
                <Text style={[s.td, s.cQt]}> </Text>
                <Text style={[s.td, s.cPu]}> </Text>
                <Text style={[s.td, s.cIm]}> </Text>
              </View>
            )
          })}
        </View>

        {/* ── TOTALS ── */}
        <View style={s.totalsBlock}>
          <View>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>SUB-TOTAL</Text>
              <Text style={s.tValue}>{fmt(remission.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>DESCUENTO</Text>
              <Text style={s.tValue}>{fmt(remission.discount)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>TOTAL</Text>
              <Text style={s.tValueTotal}>{fmt(remission.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={s.obsBox}>
            <Text style={s.obsLabel}>OBSERVACIONES:</Text>
            <Text style={{ fontSize: 8 }}>{remission.notes ?? ''}</Text>
          </View>
          <View style={s.signBlock}>
            <Text style={{ fontSize: 7.5, color: '#333', marginBottom: 28 }}>
              {remission.recipientName ?? ''}
            </Text>
            <View style={s.signLine}>
              <Text>NOMBRE Y FIRMA DE RECIBIDO</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}
