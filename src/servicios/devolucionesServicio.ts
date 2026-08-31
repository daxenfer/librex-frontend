import api from './apiCliente'
import { fetchDeletionImpact } from './borradoServicio'

export interface ReturnNoteDetailDto {
  id: number
  productId: number
  productName: string
  supplierName?: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface ReturnNoteDto {
  id: number
  folioNumber: number
  folioFormatted: string
  customerId: number
  customerName: string
  remissionId?: number
  remissionFolioFormatted?: string
  unlinkedReason?: string
  date: string
  notes?: string
  receivedBy?: string
  discount: number
  subtotal: number
  total: number
  isActive: boolean
  details: ReturnNoteDetailDto[]
}

export interface CreateReturnNoteDetailDto {
  productId: number
  quantity: number
  unitPrice: number
}

export interface CreateReturnNoteDto {
  customerId: number
  // Se puede omitir, pero entonces unlinkedReason es obligatorio: el backend lo valida.
  remissionId?: number
  unlinkedReason?: string
  date: string
  notes?: string
  receivedBy?: string
  discount: number
  details: CreateReturnNoteDetailDto[]
}

// Sin campos propios: isActive no lo edita el usuario, solo lo mueve el borrado.
export type UpdateReturnNoteDto = CreateReturnNoteDto

export const returnNoteService = {
  getAll: async (): Promise<ReturnNoteDto[]> => {
    const { data } = await api.get<ReturnNoteDto[]>('/api/returns')
    return data
  },
  getById: async (id: number): Promise<ReturnNoteDto> => {
    const { data } = await api.get<ReturnNoteDto>(`/api/returns/${id}`)
    return data
  },
  create: async (dto: CreateReturnNoteDto): Promise<ReturnNoteDto> => {
    const { data } = await api.post<ReturnNoteDto>('/api/returns', dto)
    return data
  },
  update: async (id: number, dto: UpdateReturnNoteDto): Promise<ReturnNoteDto> => {
    const { data } = await api.put<ReturnNoteDto>(`/api/returns/${id}`, dto)
    return data
  },
  getDeletionImpact: (id: number) => fetchDeletionImpact('returns', id),
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/returns/${id}`)
  },
}
