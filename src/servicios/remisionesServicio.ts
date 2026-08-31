import api from './apiCliente'
import { fetchDeletionImpact } from './borradoServicio'

export interface RemissionDetailDto {
  id: number
  productId: number
  productName: string
  isbn?: string
  supplierName?: string
  teacher?: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface RemissionDto {
  id: number
  folioNumber: number
  folioFormatted: string
  customerId: number
  customerName: string
  customerAddress: string
  customerPostalCode: string
  customerPhone: string
  customerCity: string
  date: string
  createdAt: string
  salesPerson?: string
  notes?: string
  recipientName?: string
  purchaseOrder?: string
  deliveryDate: string
  paymentDueDate: string
  returnPercentage: number
  returnDueDate: string
  discountAmount: number
  subtotal: number
  total: number
  isActive: boolean
  details: RemissionDetailDto[]
}

export interface CreateRemissionDetailDto {
  productId: number
  teacher?: string
  quantity: number
  unitPrice: number
}

export interface CreateRemissionDto {
  customerId: number
  salesPerson?: string
  notes?: string
  recipientName?: string
  purchaseOrder?: string
  deliveryDate: string
  paymentDueDate: string
  returnPercentage: number
  returnDueDate: string
  discountAmount: number
  details: CreateRemissionDetailDto[]
}

// Sin campos propios: isActive no lo edita el usuario, solo lo mueve el borrado.
export type UpdateRemissionDto = CreateRemissionDto

export const remissionService = {
  getAll: async (): Promise<RemissionDto[]> => {
    const { data } = await api.get<RemissionDto[]>('/api/remissions')
    return data
  },
  getById: async (id: number): Promise<RemissionDto> => {
    const { data } = await api.get<RemissionDto>(`/api/remissions/${id}`)
    return data
  },
  create: async (dto: CreateRemissionDto): Promise<RemissionDto> => {
    const { data } = await api.post<RemissionDto>('/api/remissions', dto)
    return data
  },
  update: async (id: number, dto: UpdateRemissionDto): Promise<RemissionDto> => {
    const { data } = await api.put<RemissionDto>(`/api/remissions/${id}`, dto)
    return data
  },
  getDeletionImpact: (id: number) => fetchDeletionImpact('remissions', id),
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/remissions/${id}`)
  },
}
