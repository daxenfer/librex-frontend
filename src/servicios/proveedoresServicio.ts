import api from './apiCliente'
import { fetchDeletionImpact } from './borradoServicio'

export interface SupplierDto {
  id: number
  name: string
  contact: string
  phone: string
  email: string
  isActive: boolean
}

export interface CreateSupplierDto {
  name: string
  contact: string
  phone: string
  email: string
}

export interface UpdateSupplierDto {
  name: string
  contact: string
  phone: string
  email: string
  isActive: boolean
}

export const supplierService = {
  getAll: async (): Promise<SupplierDto[]> => {
    const { data } = await api.get<SupplierDto[]>('/api/suppliers')
    return data
  },
  getById: async (id: number): Promise<SupplierDto> => {
    const { data } = await api.get<SupplierDto>(`/api/suppliers/${id}`)
    return data
  },
  create: async (dto: CreateSupplierDto): Promise<SupplierDto> => {
    const { data } = await api.post<SupplierDto>('/api/suppliers', dto)
    return data
  },
  update: async (id: number, dto: UpdateSupplierDto): Promise<SupplierDto> => {
    const { data } = await api.put<SupplierDto>(`/api/suppliers/${id}`, dto)
    return data
  },
  getDeletionImpact: (id: number) => fetchDeletionImpact('suppliers', id),
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/suppliers/${id}`)
  },
}
