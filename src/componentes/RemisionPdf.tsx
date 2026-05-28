import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RemissionDto } from '../servicios/remisionesServicio'
import type { CompanySettingsDto } from '../servicios/settingsServicio'

const BLUE = '#003087'
const BLUE_LIGHT = '#e8eef8'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: '14 20 12 20', color: '#111' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', marginBottom: 6, borderBottom: `2px solid ${BLUE}`, paddingBottom: 6 },

  // Left: company info
  companyBlock: { flex: 1, paddingRight: 10 },
  companyName:  { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 0.5 },
  companyBrand: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 2 },
  companyLine:  { fontSize: 6.5, color: '#333', marginTop: 1 },

  // Right: 2 rows × 3 boxes
  metaGrid:    { flexDirection: 'column', gap: 3 },
  metaRow:     { flexDirection: 'row', gap: 3 },
  metaBox:     { borderWidth: 1, borderColor: BLUE, minWidth: 90, padding: '2 5' },
  metaLabel:   { fontSize: 5.5, color: BLUE, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  metaValue:   { fontSize: 8 },

  // Folio box (top-right, prominent)
  folioBox:    { backgroundColor: BLUE, padding: '3 10', alignItems: 'center', justifyContent: 'center', minWidth: 110 },
  folioTag:    { fontSize: 6.5, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  folioNum:    { fontSize: 18, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },

  // ── Client section ───────────────────────────────────────────────────────────
  clientSection: { marginBottom: 5, borderWidth: 1, borderColor: BLUE, padding: '3 6' },
  clientLine:    { flexDirection: 'row', marginBottom: 2 },
  clientLabel:   { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE, marginRight: 4 },
  clientValue:   { fontSize: 7, flex: 1, borderBottomWidth: 0.75, borderBottomColor: '#aaa', paddingBottom: 1 },
  clientInline:  { flexDirection: 'row', gap: 10 },
  clientField:   { flexDirection: 'row', alignItems: 'flex-end' },
  clientShortVal:{ fontSize: 7, borderBottomWidth: 0.75, borderBottomColor: '#aaa', paddingBottom: 1, minWidth: 60, marginLeft: 3 },
  clientCityVal: { fontSize: 7, borderBottomWidth: 0.75, borderBottomColor: '#aaa', paddingBottom: 1, flex: 1, marginLeft: 3 },

  // ── Table ────────────────────────────────────────────────────────────────────
  table:  { borderWidth: 1.5, borderColor: BLUE, marginBottom: 5 },
  thead:  { flexDirection: 'row', backgroundColor: BLUE },
  th:     { paddingVertical: 3, paddingHorizontal: 3, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, borderRightWidth: 0.5, borderRightColor: 'rgba(255,255,255,0.3)' },
  tr:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#c8d4e8' },
  trAlt:  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#c8d4e8', backgroundColor: BLUE_LIGHT },
  td:     { paddingVertical: 2, paddingHorizontal: 3, fontSize: 7, borderRightWidth: 0.5, borderRightColor: '#c8d4e8' },

  // Column widths
  cMa: { width: '12%' },
  cEd: { width: '17%' },
  cTi: { flex: 1 },
  cQt: { width: '9%',  textAlign: 'right' },
  cPu: { width: '11%', textAlign: 'right' },
  cIm: { width: '10%', textAlign: 'right', borderRightWidth: 0 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer:       { flexDirection: 'row', gap: 8 },
  obsBox:       { flex: 1, borderWidth: 1, borderColor: BLUE, padding: '3 5', minHeight: 46 },
  obsLabel:     { fontSize: 6, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 3 },
  obsText:      { fontSize: 7 },
  signBlock:    { width: 160, flexDirection: 'column', justifyContent: 'flex-end' },
  signLine:     { borderTopWidth: 1.5, borderTopColor: BLUE, paddingTop: 3, textAlign: 'center', fontSize: 6.5, color: BLUE, fontFamily: 'Helvetica-Bold' },
  signName:     { fontSize: 7, textAlign: 'center', marginBottom: 22 },

  // ── Totals ───────────────────────────────────────────────────────────────────
  totalsBlock:  { width: 165, flexDirection: 'column', justifyContent: 'flex-end' },
  totalRow:     { flexDirection: 'row', marginBottom: 2 },
  tLabel:       { backgroundColor: BLUE, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 7, paddingVertical: 2.5, paddingHorizontal: 6, width: 80, textAlign: 'right' },
  tValue:       { borderWidth: 1, borderColor: BLUE, fontSize: 7, paddingVertical: 2.5, paddingHorizontal: 6, width: 85, textAlign: 'right' },
  tValueTotal:  { borderWidth: 2, borderColor: BLUE, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLUE, paddingVertical: 2.5, paddingHorizontal: 6, width: 85, textAlign: 'right' },
})

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const MIN_ROWS = 12

interface Props {
  remission: RemissionDto
  settings: CompanySettingsDto
}

export function RemisionPdf({ remission, settings }: Props) {
  const emptyRows = Math.max(0, MIN_ROWS - remission.details.length)

  const phones = [settings.phone1, settings.phone2].filter(Boolean).join('  |  ')
  const addressLine = [settings.address, settings.postalCode, settings.city, settings.state].filter(Boolean).join(', ')

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          {/* Left: company info */}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{settings.brandName || settings.companyName}</Text>
            {settings.brandName && settings.companyName !== settings.brandName && (
              <Text style={s.companyBrand}>{settings.companyName}</Text>
            )}
            {settings.rfc ? <Text style={s.companyLine}>R.F.C. {settings.rfc}</Text> : null}
            {phones ? <Text style={s.companyLine}>TELS. {phones}</Text> : null}
            {settings.email ? <Text style={s.companyLine}>E-mail: {settings.email}</Text> : null}
            {addressLine ? <Text style={s.companyLine}>{addressLine}</Text> : null}
          </View>

          {/* Right: 2 rows × 3 boxes */}
          <View style={s.metaGrid}>
            {/* Row 1: VENDEDOR | FECHA | REMISIÓN */}
            <View style={s.metaRow}>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>VENDEDOR</Text>
                <Text style={s.metaValue}>{remission.salesPerson ?? ''}</Text>
              </View>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>FECHA</Text>
                <Text style={s.metaValue}>{fmtDate(remission.date)}</Text>
              </View>
              <View style={[s.folioBox]}>
                <Text style={s.folioTag}>REMISIÓN</Text>
                <Text style={s.folioNum}>N° {remission.folioFormatted}</Text>
              </View>
            </View>
            {/* Row 2: FECHA LÍMITE PAGO | % DEVOLUCIÓN | FECHA LÍMITE DEVOLUCIÓN */}
            <View style={s.metaRow}>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>FECHA LÍMITE DE PAGO</Text>
                <Text style={s.metaValue}>{fmtDate(remission.paymentDueDate)}</Text>
              </View>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>PORCENTAJE DE DEVOLUCIÓN</Text>
                <Text style={s.metaValue}>{remission.returnPercentage}%</Text>
              </View>
              <View style={s.metaBox}>
                <Text style={s.metaLabel}>FECHA LÍMITE DE DEVOLUCIÓN</Text>
                <Text style={s.metaValue}>{fmtDate(remission.returnDueDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── CLIENT SECTION ── */}
        <View style={s.clientSection}>
          <View style={s.clientLine}>
            <Text style={s.clientLabel}>CLIENTE:</Text>
            <Text style={s.clientValue}>{remission.customerName}</Text>
          </View>
          <View style={s.clientLine}>
            <Text style={s.clientLabel}>DOMICILIO:</Text>
            <Text style={s.clientValue}>{remission.customerAddress}</Text>
          </View>
          <View style={s.clientInline}>
            <View style={s.clientField}>
              <Text style={s.clientLabel}>C.P.</Text>
              <Text style={s.clientShortVal}>{remission.customerPostalCode}</Text>
            </View>
            <View style={[s.clientField, { flex: 1 }]}>
              <Text style={s.clientLabel}>TEL:</Text>
              <Text style={[s.clientShortVal, { flex: 1 }]}>{remission.customerPhone}</Text>
            </View>
            <View style={[s.clientField, { flex: 2 }]}>
              <Text style={s.clientLabel}>CIUDAD:</Text>
              <Text style={s.clientCityVal}>{remission.customerCity}</Text>
            </View>
          </View>
        </View>

        {/* ── TABLE ── */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cMa]}>MAESTRO</Text>
            <Text style={[s.th, s.cEd]}>EDITORIAL</Text>
            <Text style={[s.th, s.cTi]}>TÍTULO</Text>
            <Text style={[s.th, s.cQt]}>CANTIDAD</Text>
            <Text style={[s.th, s.cPu]}>P. UNITARIO</Text>
            <Text style={[s.th, s.cIm]}>IMPORTE</Text>
          </View>
          {remission.details.map((d, i) => (
            <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
              <Text style={[s.td, s.cMa]}>{d.teacher ?? ''}</Text>
              <Text style={[s.td, s.cEd]}>{d.publisherName ?? ''}</Text>
              <Text style={[s.td, s.cTi]}>{d.productName}</Text>
              <Text style={[s.td, s.cQt]}>{d.quantity}</Text>
              <Text style={[s.td, s.cPu]}>{fmt(d.unitPrice)}</Text>
              <Text style={[s.td, s.cIm]}>{fmt(d.amount)}</Text>
            </View>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => {
            const idx = remission.details.length + i
            return (
              <View key={`e${i}`} style={idx % 2 === 0 ? s.tr : s.trAlt}>
                <Text style={[s.td, s.cMa]}> </Text>
                <Text style={[s.td, s.cEd]}> </Text>
                <Text style={[s.td, s.cTi]}> </Text>
                <Text style={[s.td, s.cQt]}> </Text>
                <Text style={[s.td, s.cPu]}> </Text>
                <Text style={[s.td, s.cIm]}> </Text>
              </View>
            )
          })}
        </View>

        {/* ── FOOTER: OBSERVACIONES + FIRMA + TOTALES ── */}
        <View style={s.footer}>
          {/* Observaciones */}
          <View style={s.obsBox}>
            <Text style={s.obsLabel}>OBSERVACIONES:</Text>
            <Text style={s.obsText}>{remission.notes ?? ''}</Text>
          </View>

          {/* Firma */}
          <View style={s.signBlock}>
            <Text style={s.signName}>{remission.recipientName ?? ''}</Text>
            <View style={s.signLine}>
              <Text>NOMBRE Y FIRMA DE RECIBIDO</Text>
            </View>
          </View>

          {/* Totales */}
          <View style={s.totalsBlock}>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>SUB-TOTAL</Text>
              <Text style={s.tValue}>{fmt(remission.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>DESCUENTO {remission.discountPercentage > 0 ? `${remission.discountPercentage}%` : ''}</Text>
              <Text style={s.tValue}>{fmt(remission.discountAmount)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.tLabel}>TOTAL</Text>
              <Text style={s.tValueTotal}>{fmt(remission.total)}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}
