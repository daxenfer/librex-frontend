import api from './apiCliente'

export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Cheque', 'Otro'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export interface PaymentDto {
  id: number
  folioNumber: number
  folioFormatted: string
  customerId: number
  customerName: string
  remissionId: number
  remissionFolioFormatted: string
  date: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  isActive: boolean
}

export interface CreatePaymentDto {
  customerId: number
  remissionId: number
  date: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
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
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/payments/${id}`)
  },
}
