import api from './apiCliente'
import { fetchDeletionImpact } from './borradoServicio'

export const PAYMENT_METHODS = ['Efectivo', 'Cheque', 'Depósito', 'A cargo del Banco'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export interface PaymentAllocationDto {
  remissionId: number
  remissionFolioFormatted: string
  amount: number
}

export interface PaymentDto {
  id: number
  folioNumber: number
  folioFormatted: string
  customerId: number
  customerName: string
  date: string
  amount: number
  appliedAmount: number
  unappliedAmount: number
  paymentMethod: string
  reference?: string
  notes?: string
  receivedFrom?: string
  concept?: string
  collectedBy?: string
  city?: string
  isActive: boolean
  allocations: PaymentAllocationDto[]
}

export interface CreatePaymentAllocationDto {
  remissionId: number
  amount: number
}

export interface CreatePaymentDto {
  customerId: number
  date: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  receivedFrom?: string
  concept?: string
  collectedBy?: string
  city?: string
  // Puede ir vacía: el pago se captura a nivel cliente (recibo) y se asigna a
  // remisiones después, en Cuentas por Cobrar.
  allocations?: CreatePaymentAllocationDto[]
}

export interface UpdatePaymentDto extends CreatePaymentDto {
  isActive: boolean
}

export const paymentService = {
  getAll: async (): Promise<PaymentDto[]> => {
    const { data } = await api.get<PaymentDto[]>('/api/payments')
    return data
  },
  getById: async (id: number): Promise<PaymentDto> => {
    const { data } = await api.get<PaymentDto>(`/api/payments/${id}`)
    return data
  },
  create: async (dto: CreatePaymentDto): Promise<PaymentDto> => {
    const { data } = await api.post<PaymentDto>('/api/payments', dto)
    return data
  },
  update: async (id: number, dto: UpdatePaymentDto): Promise<PaymentDto> => {
    const { data } = await api.put<PaymentDto>(`/api/payments/${id}`, dto)
    return data
  },
  getDeletionImpact: (id: number) => fetchDeletionImpact('payments', id),
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/payments/${id}`)
  },
}
