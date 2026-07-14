import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { PaymentDto } from '../servicios/pagosServicio'
import type { CompanySettingsDto } from '../servicios/settingsServicio'

const BLUE = '#003087'
const RED = '#C42026'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: '28 34', color: '#111' },

  header: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 14, borderBottom: `2.5px solid ${BLUE}`, paddingBottom: 10 },
  companyBlock: { flex: 1, paddingRight: 10 },
  companyTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerLogo: { width: 46, height: 46, objectFit: 'contain', marginRight: 8 },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE, letterSpacing: 0.5 },
  companyRfc: { fontSize: 8, color: '#333', marginTop: 1 },
  companyLine: { fontSize: 7.5, color: '#444', marginTop: 1 },

  // Right: RECIBO DE PAGO + VENDEDOR boxes (blue header strip + white body), folio in red
  metaStack: { flexDirection: 'row', gap: 5, alignItems: 'stretch' },
  metaBox: { borderWidth: 1, borderColor: BLUE, justifyContent: 'flex-start' },
  metaHead: { backgroundColor: BLUE, paddingVertical: 3, paddingHorizontal: 5, justifyContent: 'center' },
  metaHeadText: { fontSize: 6.5, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 0.6, textAlign: 'center' },
  metaBody: { paddingVertical: 6, paddingHorizontal: 6, minHeight: 30, justifyContent: 'center' },
  metaValue: { fontSize: 9, textAlign: 'center' },
  folioNum: { fontSize: 16, color: RED, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textAlign: 'center' },

  body: { position: 'relative', borderWidth: 1, borderColor: BLUE, padding: 14 },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', width: '78%', height: '82%', objectFit: 'contain', opacity: 0.06 },
  line: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 13 },
  lineLabel: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', marginRight: 6 },
  lineValue: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 10 },

  // La cantidad de  $ <monto>   M.N.  <letras>
  amountValue: { borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 11, fontFamily: 'Helvetica-Bold', minWidth: 90, textAlign: 'center', marginRight: 8 },
  amountWords: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 8.5 },

  // Forma de Pago: 2-column checkbox grid like the physical format
  methodSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  methodGrid: { flex: 1, flexDirection: 'row', gap: 18 },
  methodCol: { flex: 1, flexDirection: 'column', gap: 9 },
  methodItem: { flexDirection: 'row', alignItems: 'flex-end' },
  checkbox: { width: 10, height: 10, borderWidth: 1, borderColor: '#333', marginRight: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: BLUE, borderColor: BLUE },
  checkMark: { fontSize: 7.5, color: '#fff', fontFamily: 'Helvetica-Bold' },
  methodText: { fontSize: 9, marginRight: 5 },
  methodLine: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 1, fontSize: 8.5 },

  ruleLine: { borderBottomWidth: 0.8, borderBottomColor: '#999', minHeight: 13, marginBottom: 13 },

  // Municipio ______ a __ de ______ de ____
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  dateLabel: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', marginRight: 6 },
  dateBlank: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 10 },
  dateWord: { fontSize: 9, color: '#333', marginHorizontal: 6 },
  dateValue: { borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 10, minWidth: 34, textAlign: 'center' },
  dateValueWide: { borderBottomWidth: 0.8, borderBottomColor: '#999', paddingBottom: 2, fontSize: 10, minWidth: 80, textAlign: 'center' },

  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  signBlock: { width: '42%', alignItems: 'center' },
  signTitle: { fontSize: 8.5, color: '#333', fontFamily: 'Helvetica-Bold', marginBottom: 4, textAlign: 'center' },
  signName: { fontSize: 9, color: '#333', marginBottom: 22, minHeight: 12, textAlign: 'center' },
  signLine: { borderTopWidth: 1, borderTopColor: BLUE, width: '100%', paddingTop: 3, textAlign: 'center', fontSize: 8, color: BLUE, fontFamily: 'Helvetica-Bold' },

  noteBanner: { marginTop: 26, alignSelf: 'center', backgroundColor: BLUE, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 18 },
  noteText: { fontSize: 7.5, color: '#fff', textAlign: 'center', fontStyle: 'italic' },
})

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// ── Número a letras (español, formato moneda) ──
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const VEINTIS = ['VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE']
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function decenasALetras(n: number): string {
  if (n < 10) return UNIDADES[n]
  if (n < 20) return ESPECIALES[n - 10]
  if (n < 30) return VEINTIS[n - 20]
  const d = Math.floor(n / 10)
  const u = n % 10
  return u ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d]
}

function centenasALetras(n: number): string {
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const out = c ? CENTENAS[c] : ''
  if (resto) return out ? `${out} ${decenasALetras(resto)}` : decenasALetras(resto)
  return out
}

function enteroALetras(num: number): string {
  if (num === 0) return 'CERO'
  const millones = Math.floor(num / 1_000_000)
  const miles = Math.floor((num % 1_000_000) / 1000)
  const resto = num % 1000
  const parts: string[] = []
  if (millones) parts.push(millones === 1 ? 'UN MILLÓN' : `${centenasALetras(millones)} MILLONES`)
  if (miles) parts.push(miles === 1 ? 'MIL' : `${centenasALetras(miles)} MIL`)
  if (resto) parts.push(centenasALetras(resto))
  return parts.join(' ')
}

function numeroALetras(n: number): string {
  const entero = Math.floor(n)
  const centavos = Math.round((n - entero) * 100)
  let letras = enteroALetras(entero)
  // "...UNO" → "...UN" antes del sustantivo (UN PESO, TREINTA Y UN PESOS)
  letras = letras.replace(/UNO$/, 'UN')
  const moneda = entero === 1 ? 'PESO' : 'PESOS'
  return `${letras} ${moneda} ${String(centavos).padStart(2, '0')}/100 M.N.`
}

interface Props {
  payment: PaymentDto
  settings: CompanySettingsDto
}

// Checkbox + label + underline, mirroring the pre-printed format's payment grid.
function MethodItem({ label, checked, value, noCheckbox }: { label: string; checked?: boolean; value?: string; noCheckbox?: boolean }) {
  return (
    <View style={s.methodItem}>
      {noCheckbox ? null : (
        <View style={[s.checkbox, ...(checked ? [s.checkboxOn] : [])]}>
          {checked ? <Text style={s.checkMark}>X</Text> : null}
        </View>
      )}
      <Text style={s.methodText}>{label}</Text>
      <Text style={s.methodLine}>{value ?? ' '}</Text>
    </View>
  )
}

export function PagoPdf({ payment, settings }: Props) {
  const logo = settings.logoBase64 || ''
  const phones = [settings.phone1, settings.phone2].filter(Boolean).join('  |  ')
  const addressLine = [settings.address, settings.postalCode, settings.city, settings.state].filter(Boolean).join(', ')

  const d = new Date(payment.date)

  // Physical format: Deposito's bank goes on its own "A cargo del Banco" line;
  // the "A cargo del Banco" payment method checks the Deposito box.
  const method = payment.paymentMethod
  const ref = payment.reference ?? ''
  const efectivoOn = method === 'Efectivo'
  const chequeOn = method === 'Cheque'
  const depositoOn = method === 'Depósito' || method === 'A cargo del Banco'
  const bancoValue = method === 'A cargo del Banco' ? ref : ''

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* HEADER */}
        <View style={s.header}>
          <View style={s.companyBlock}>
            <View style={s.companyTopRow}>
              {logo ? <Image src={logo} style={s.headerLogo} /> : null}
              <View>
                <Text style={s.companyName}>{settings.companyName || settings.brandName}</Text>
                {settings.rfc ? <Text style={s.companyRfc}>R.F.C. {settings.rfc}</Text> : null}
              </View>
            </View>
            {phones ? <Text style={s.companyLine}>TELS. {phones}{settings.email ? `   E-mail: ${settings.email}` : ''}</Text> : settings.email ? <Text style={s.companyLine}>E-mail: {settings.email}</Text> : null}
            {addressLine ? <Text style={s.companyLine}>{addressLine}</Text> : null}
          </View>
          <View style={s.metaStack}>
            <View style={[s.metaBox, { minWidth: 120 }]}>
              <View style={s.metaHead}><Text style={s.metaHeadText}>RECIBO DE PAGO</Text></View>
              <View style={s.metaBody}><Text style={s.folioNum}>N° {payment.folioFormatted}</Text></View>
            </View>
            <View style={[s.metaBox, { minWidth: 90 }]}>
              <View style={s.metaHead}><Text style={s.metaHeadText}>VENDEDOR</Text></View>
              <View style={s.metaBody}><Text style={s.metaValue}>{payment.collectedBy ?? ''}</Text></View>
            </View>
          </View>
        </View>

        {/* BODY */}
        <View style={s.body}>
          {logo ? <Image src={logo} style={s.watermark} /> : null}

          <View style={s.line}>
            <Text style={s.lineLabel}>Recibi(mos) de:</Text>
            <Text style={s.lineValue}>{payment.customerName}</Text>
          </View>
          <View style={s.line}>
            <Text style={s.lineLabel}>Nombre de la Escuela:</Text>
            <Text style={s.lineValue}>{payment.receivedFrom ?? ''}</Text>
          </View>

          <View style={s.line}>
            <Text style={s.lineLabel}>La cantidad de  $</Text>
            <Text style={s.amountValue}>{fmt(payment.amount)}</Text>
            <Text style={s.lineLabel}>M.N.</Text>
            <Text style={s.amountWords}>{numeroALetras(payment.amount)}</Text>
          </View>

          <View style={s.methodSection}>
            <Text style={[s.lineLabel, { marginRight: 12 }]}>Forma de Pago:</Text>
            <View style={s.methodGrid}>
              <View style={s.methodCol}>
                <MethodItem label="Efectivo" checked={efectivoOn} value={efectivoOn ? ref : ''} />
                <MethodItem label="Cheque No." checked={chequeOn} value={chequeOn ? ref : ''} />
              </View>
              <View style={s.methodCol}>
                <MethodItem label="Deposito" checked={depositoOn} value={method === 'Depósito' ? ref : ''} />
                <MethodItem label="A cargo del Banco" noCheckbox value={bancoValue} />
              </View>
            </View>
          </View>

          <View style={s.line}>
            <Text style={s.lineLabel}>Por concepto de:</Text>
            <Text style={s.lineValue}>{payment.concept ?? ''}</Text>
          </View>
          <View style={s.ruleLine} />
          <View style={s.ruleLine} />

          <View style={s.dateRow}>
            <Text style={s.dateLabel}>Municipio</Text>
            <Text style={s.dateBlank}>{payment.city ?? ' '}</Text>
            <Text style={s.dateWord}>a</Text>
            <Text style={s.dateValue}>{d.getDate()}</Text>
            <Text style={s.dateWord}>de</Text>
            <Text style={s.dateValueWide}>{MESES[d.getMonth()]}</Text>
            <Text style={s.dateWord}>de</Text>
            <Text style={s.dateValue}>{d.getFullYear()}</Text>
          </View>
        </View>

        {/* SIGNATURES: label on top, signature line, caption below (like the physical) */}
        <View style={s.signRow}>
          <View style={s.signBlock}>
            <Text style={s.signTitle}>Nombre de quien extiende este recibo</Text>
            <Text style={s.signName}>{payment.collectedBy ?? ' '}</Text>
            <View style={s.signLine}><Text>VENDEDOR Ó COBRADOR</Text></View>
          </View>
          <View style={s.signBlock}>
            <Text style={s.signTitle}>Firma de conformidad</Text>
            <Text style={s.signName}> </Text>
            <View style={s.signLine}><Text>CLIENTE Ó ENCARGADO</Text></View>
          </View>
        </View>

        <View style={s.noteBanner}>
          <Text style={s.noteText}>
            Nota: No se consideran válidos los recibos extendidos por personas no autorizadas por esta Empresa.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
