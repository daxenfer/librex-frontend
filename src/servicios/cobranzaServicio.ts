import { remissionService } from './remisionesServicio'
import { paymentService } from './pagosServicio'
import { returnNoteService } from './devolucionesServicio'

// Umbral para considerar una remisión liquidada (evita arrastres por redondeo).
const EPSILON = 0.01

export interface ReceivableRemission {
  remissionId: number
  folioFormatted: string
  date: string
  paymentDueDate: string
  total: number       // total de la remisión (subtotal − descuento)
  returned: number    // Σ devoluciones de la remisión
  paid: number        // Σ asignaciones de pago a la remisión
  outstanding: number // total − devuelto − pagado
  overdue: boolean    // saldo > 0 y vencida
}

export interface UnappliedPayment {
  paymentId: number
  folioFormatted: string
  date: string
  paymentMethod: string
  amount: number      // monto total del pago
  unapplied: number   // saldo del pago aún no asignado a remisiones
}

export interface CustomerReceivable {
  customerId: number
  customerName: string
  remissions: ReceivableRemission[] // solo las no liquidadas
  totalInvoiced: number
  totalReturned: number
  totalPaid: number
  totalOutstanding: number
  overdueOutstanding: number
  openCount: number
  availableCredit: number // anticipos (pagos recibidos no asignados)
  unappliedPayments: UnappliedPayment[] // pagos con saldo disponible para aplicar
}

const startOfToday = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export const receivablesService = {
  getAll: async (): Promise<CustomerReceivable[]> => {
    const [remissions, payments, returns] = await Promise.all([
      remissionService.getAll(),
      paymentService.getAll(),
      returnNoteService.getAll(),
    ])

    // Σ asignaciones de pago por remisión.
    const paidByRemission = new Map<number, number>()
    for (const p of payments) {
      for (const a of p.allocations) {
        paidByRemission.set(a.remissionId, (paidByRemission.get(a.remissionId) ?? 0) + a.amount)
      }
    }

    // Σ devoluciones (activas) por remisión.
    const returnedByRemission = new Map<number, number>()
    for (const r of returns) {
      if (!r.isActive) continue
      returnedByRemission.set(r.remissionId, (returnedByRemission.get(r.remissionId) ?? 0) + r.total)
    }

    // Anticipos por cliente (monto recibido no asignado) y lista de pagos con saldo.
    const creditByCustomer = new Map<number, number>()
    const unappliedByCustomer = new Map<number, UnappliedPayment[]>()
    for (const p of payments) {
      if (!p.isActive || p.unappliedAmount <= EPSILON) continue
      creditByCustomer.set(p.customerId, (creditByCustomer.get(p.customerId) ?? 0) + p.unappliedAmount)
      const list = unappliedByCustomer.get(p.customerId) ?? []
      list.push({
        paymentId: p.id,
        folioFormatted: p.folioFormatted,
        date: p.date,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        unapplied: p.unappliedAmount,
      })
      unappliedByCustomer.set(p.customerId, list)
    }

    const today = startOfToday()
    const byCustomer = new Map<number, CustomerReceivable>()

    for (const rem of remissions) {
      if (!rem.isActive) continue
      const returned = returnedByRemission.get(rem.id) ?? 0
      const paid = paidByRemission.get(rem.id) ?? 0
      const outstanding = rem.total - returned - paid
      if (outstanding <= EPSILON) continue // liquidada

      const overdue = new Date(rem.paymentDueDate) < today

      let entry = byCustomer.get(rem.customerId)
      if (!entry) {
        entry = {
          customerId: rem.customerId,
          customerName: rem.customerName,
          remissions: [],
          totalInvoiced: 0,
          totalReturned: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueOutstanding: 0,
          openCount: 0,
          availableCredit: creditByCustomer.get(rem.customerId) ?? 0,
          unappliedPayments: unappliedByCustomer.get(rem.customerId) ?? [],
        }
        byCustomer.set(rem.customerId, entry)
      }

      entry.remissions.push({
        remissionId: rem.id,
        folioFormatted: rem.folioFormatted,
        date: rem.date,
        paymentDueDate: rem.paymentDueDate,
        total: rem.total,
        returned,
        paid,
        outstanding,
        overdue,
      })
      entry.totalInvoiced += rem.total
      entry.totalReturned += returned
      entry.totalPaid += paid
      entry.totalOutstanding += outstanding
      if (overdue) entry.overdueOutstanding += outstanding
      entry.openCount += 1
    }

    // Clientes con anticipo pero sin remisiones abiertas: también se muestran.
    for (const [customerId, credit] of creditByCustomer) {
      if (credit <= EPSILON || byCustomer.has(customerId)) continue
      const name = payments.find(p => p.customerId === customerId)?.customerName ?? ''
      byCustomer.set(customerId, {
        customerId, customerName: name, remissions: [],
        totalInvoiced: 0, totalReturned: 0, totalPaid: 0, totalOutstanding: 0,
        overdueOutstanding: 0, openCount: 0, availableCredit: credit,
        unappliedPayments: unappliedByCustomer.get(customerId) ?? [],
      })
    }

    return [...byCustomer.values()]
      // las remisiones, de la más antigua a la más nueva (para aplicar pagos)
      .map(c => ({ ...c, remissions: c.remissions.sort((a, b) => +new Date(a.date) - +new Date(b.date)) }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
  },
}
