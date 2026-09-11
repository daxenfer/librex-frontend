import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { RemissionDto } from '../servicios/remisionesServicio'
import type { CompanySettingsDto } from '../servicios/settingsServicio'

const BLUE = '#1A4FA0'
const GRID = '#aebfdb'
const RED = '#C42026'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: '14 20 12 20', color: '#111' },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: { flexDirection: 'row', marginBottom: 6, borderBottom: `2px solid ${BLUE}`, paddingBottom: 6 },

  // Left: company info.
  // space-between reparte el alto sobrante: la rejilla de la derecha mide más que estos
  // renglones, y sin esto quedaba una banda muerta debajo del domicilio.
  companyBlock: { flex: 1, paddingRight: 10, justifyContent: 'space-between' },
  companyTopRow:{ flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerLogo:   { width: 62, height: 62, objectFit: 'contain', flexShrink: 0 },
  companyNameWrap: { flex: 1 },
  companyName:  { fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 0.3 },
  companyRfc:   { fontSize: 7.5, color: '#333', marginTop: 2 },
  companyLine:  { fontSize: 7.3, color: '#333', marginTop: 2 },

  // Right: 4 columnas. La 1ª lleva sola la orden de compra; las otras tres apilan el dato
  // principal (franja azul) sobre su fecha o porcentaje (etiqueta chica en la esquina, como en
  // el formato de papel).
  //
  // Las cajas de abajo llevan flex:1 y por eso la rejilla mide siempre lo mismo que el bloque
  // de la empresa: crecen para igualarlo. Así no queda hueco de ningún lado, sin importar si el
  // nombre ocupa uno o dos renglones.
  metaGrid:    { flexDirection: 'row', gap: 4 },
  metaCol:     { width: 106, flexDirection: 'column', gap: 3 },
  metaColPo:   { width: 90, flexDirection: 'column' },
  metaBox:     { borderWidth: 1, borderColor: BLUE },
  metaBoxTall: { borderWidth: 1, borderColor: BLUE, flex: 1 },
  metaHead:    { backgroundColor: BLUE, paddingVertical: 2, paddingHorizontal: 2, minHeight: 18, justifyContent: 'center' },
  metaHeadText:{ fontSize: 6, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 0.4, textAlign: 'center' },
  metaBody:    { paddingVertical: 3, paddingHorizontal: 4, minHeight: 21, justifyContent: 'center' },
  metaBodyTall:{ paddingVertical: 3, paddingHorizontal: 4, flex: 1, justifyContent: 'center' },
  metaValue:   { fontSize: 8 },

  // Celda inferior: sin franja, con la etiqueta chica arriba a la izquierda.
  metaBoxSub:  { borderWidth: 1, borderColor: BLUE, flex: 1, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 3, justifyContent: 'flex-start' },
  metaSubLabel:{ fontSize: 5, color: BLUE, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3, marginBottom: 2 },

  // Folio (red number on white, blue header strip)
  folioValue:  { fontSize: 16, color: RED, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textAlign: 'center' },

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
  tableWrap: { position: 'relative', marginBottom: 5 },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', width: '95%', height: '92%', objectFit: 'contain', opacity: 0.06 },
  table:  { borderWidth: 1.5, borderColor: BLUE },
  thead:  { flexDirection: 'row', backgroundColor: BLUE },
  th:     { paddingVertical: 3.5, paddingHorizontal: 3, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, borderRightWidth: 0.5, borderRightColor: 'rgba(255,255,255,0.4)' },
  tr:     { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: GRID, minHeight: 16 },
  td:     { paddingVertical: 3, paddingHorizontal: 3, fontSize: 7, borderRightWidth: 0.5, borderRightColor: GRID },

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

// Medidas por orientación. Carta son 792×612 en horizontal y 612×792 en vertical; restando el
// padding de la página quedan 752 y 572pt de ancho útil. En vertical todo tiene que encoger o
// la rejilla se come el bloque de la empresa.
const LAYOUT = {
  landscape: { usableWidth: 752, poWidth: 90, colWidth: 106, minRows: 21 },
  portrait:  { usableWidth: 572, poWidth: 64, colWidth: 76,  minRows: 31 },
} as const

// Ancho que le queda al nombre: el útil menos la rejilla, su separación, el logo y su hueco.
function nameWidth(l: (typeof LAYOUT)[keyof typeof LAYOUT]) {
  return l.usableWidth - (l.poWidth + l.colWidth * 3 + 12) - 10 - 62 - 9
}

// El nombre se achica en vez de partirse en dos renglones.
//
// Los factores salen de medir Helvetica-Bold: "CLAUDIA VANESSA PEREZ SANCHEZ" ocupa 319pt a
// 17pt (0.647 por carácter y punto) y el mismo nombre en minúsculas solo 267 (0.542). Vale la
// pena distinguirlos: con un único factor conservador, un nombre normal se achicaba de más.
function companyNameSize(name: string, available: number) {
  const factor = name === name.toUpperCase() ? 0.66 : 0.56
  for (const size of [17, 15, 13, 11.5, 10]) {
    if (name.length * size * factor <= available) return size
  }
  return 10
}

interface Props {
  remission: RemissionDto
  settings: CompanySettingsDto
  isbnByProductId?: Record<number, string>
  orientation?: 'landscape' | 'portrait'
}

export function RemisionPdf({ remission, settings, isbnByProductId = {}, orientation = 'landscape' }: Props) {
  const layout = LAYOUT[orientation]
  // Las filas vacías llegan hasta abajo de la hoja, como en el formato de papel. Antes eran 12
  // fijas y el documento terminaba a media página.
  const emptyRows = Math.max(0, layout.minRows - remission.details.length)

  // El nombre del titular (o la razón social) es el que va junto al RFC, como en el formato de
  // papel. El nombre comercial es el respaldo: el logo ya lo lleva impreso.
  const headerName = settings.companyName || settings.brandName
  const logo = settings.logoBase64 || ''
  const phones = [settings.phone1, settings.phone2].filter(Boolean).join('  |  ')
  const addressLine = [settings.address, settings.postalCode, settings.city, settings.state].filter(Boolean).join(', ')

  return (
    <Document>
      <Page size="LETTER" orientation={orientation} style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          {/* Left: company info */}
          <View style={s.companyBlock}>
            <View style={s.companyTopRow}>
              {logo ? <Image src={logo} style={s.headerLogo} /> : null}
              <View style={s.companyNameWrap}>
                <Text style={[s.companyName, { fontSize: companyNameSize(headerName, nameWidth(layout)) }]}>{headerName}</Text>
                {settings.rfc ? <Text style={s.companyRfc}>R.F.C. {settings.rfc}</Text> : null}
              </View>
            </View>
            {phones ? (
              <Text style={s.companyLine}>TELS. {phones}{settings.email ? `   E-mail: ${settings.email}` : ''}</Text>
            ) : settings.email ? (
              <Text style={s.companyLine}>E-mail: {settings.email}</Text>
            ) : null}
            {addressLine ? <Text style={s.companyLine}>{addressLine}</Text> : null}
          </View>

          {/* Right: 4 columns. La primera lleva sola la orden de compra y ocupa todo el alto;
              las otras tres apilan el dato principal sobre su fecha o porcentaje, como en el
              formato de papel. Antes la orden ocupaba una tercera fila propia de ancho completo,
              que era lo que estiraba el encabezado. */}
          <View style={s.metaGrid}>
            <View style={[s.metaColPo, { width: layout.poWidth }]}>
              <View style={s.metaBoxTall}>
                <View style={s.metaHead}><Text style={s.metaHeadText}>ORDEN DE COMPRA</Text></View>
                <View style={s.metaBodyTall}><Text style={s.metaValue}>{remission.purchaseOrder ?? ''}</Text></View>
              </View>
            </View>

            <View style={[s.metaCol, { width: layout.colWidth }]}>
              <View style={s.metaBox}>
                <View style={s.metaHead}><Text style={s.metaHeadText}>VENDEDOR</Text></View>
                <View style={s.metaBody}><Text style={s.metaValue}>{remission.salesPerson ?? ''}</Text></View>
              </View>
              <View style={s.metaBoxSub}>
                <Text style={s.metaSubLabel}>FECHA LÍMITE DE PAGO</Text>
                <Text style={s.metaValue}>{fmtDate(remission.paymentDueDate)}</Text>
              </View>
            </View>

            <View style={[s.metaCol, { width: layout.colWidth }]}>
              <View style={s.metaBox}>
                <View style={s.metaHead}><Text style={s.metaHeadText}>FECHA</Text></View>
                <View style={s.metaBody}><Text style={s.metaValue}>{fmtDate(remission.date)}</Text></View>
              </View>
              <View style={s.metaBoxSub}>
                <Text style={s.metaSubLabel}>PORCENTAJE DE DEVOLUCIÓN</Text>
                <Text style={s.metaValue}>{remission.returnPercentage}%</Text>
              </View>
            </View>

            <View style={[s.metaCol, { width: layout.colWidth }]}>
              <View style={s.metaBox}>
                <View style={s.metaHead}><Text style={s.metaHeadText}>REMISIÓN</Text></View>
                <View style={s.metaBody}><Text style={s.folioValue}>N° {remission.folioFormatted}</Text></View>
              </View>
              <View style={s.metaBoxSub}>
                <Text style={s.metaSubLabel}>FECHA LÍMITE DE DEVOLUCIÓN</Text>
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
        <View style={s.tableWrap}>
        {logo ? <Image src={logo} style={s.watermark} /> : null}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cMa]}>ISBN</Text>
            <Text style={[s.th, s.cEd]}>EDITORIAL</Text>
            <Text style={[s.th, s.cTi]}>TÍTULO</Text>
            <Text style={[s.th, s.cQt]}>CANTIDAD</Text>
            <Text style={[s.th, s.cPu]}>P. UNITARIO</Text>
            <Text style={[s.th, s.cIm]}>IMPORTE</Text>
          </View>
          {remission.details.map((d, i) => (
            <View key={i} style={s.tr}>
              <Text style={[s.td, s.cMa]}>{isbnByProductId[d.productId] ?? ''}</Text>
              <Text style={[s.td, s.cEd]}>{d.supplierName ?? ''}</Text>
              <Text style={[s.td, s.cTi]}>{d.productName}</Text>
              <Text style={[s.td, s.cQt]}>{d.quantity}</Text>
              <Text style={[s.td, s.cPu]}>{fmt(d.unitPrice)}</Text>
              <Text style={[s.td, s.cIm]}>{fmt(d.amount)}</Text>
            </View>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => {
            return (
              <View key={`e${i}`} style={s.tr}>
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
              <Text style={s.tLabel}>DESCUENTO</Text>
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
