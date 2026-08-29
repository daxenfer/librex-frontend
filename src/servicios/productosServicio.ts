import api from './apiCliente'
import { fetchDeletionImpact } from './borradoServicio'

export const SCHOOL_LEVELS = ['Preescolar', 'Primaria', 'Secundaria'] as const
export type SchoolLevel = typeof SCHOOL_LEVELS[number]

export const UNIT_TYPES = ['Unidad', 'Caja'] as const
export type UnitType = typeof UNIT_TYPES[number]

export interface ProductDto {
  id: number
  name: string
  isbn?: string
  schoolLevel?: string
  unitType: string
  supplierId: number
  supplierName: string
  isActive: boolean
}

export interface CreateProductDto {
  name: string
  isbn?: string
  schoolLevel?: string
  unitType: string
  supplierId: number
}

export interface UpdateProductDto {
  name: string
  isbn?: string
  schoolLevel?: string
  unitType: string
  supplierId: number
  isActive: boolean
}

export const productService = {
  getAll: async (): Promise<ProductDto[]> => {
    const { data } = await api.get<ProductDto[]>('/api/products')
    return data
  },
  getById: async (id: number): Promise<ProductDto> => {
    const { data } = await api.get<ProductDto>(`/api/products/${id}`)
    return data
  },
  create: async (dto: CreateProductDto): Promise<ProductDto> => {
    const { data } = await api.post<ProductDto>('/api/products', dto)
    return data
  },
  update: async (id: number, dto: UpdateProductDto): Promise<ProductDto> => {
    const { data } = await api.put<ProductDto>(`/api/products/${id}`, dto)
    return data
  },
  getDeletionImpact: (id: number) => fetchDeletionImpact('products', id),
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/products/${id}`)
  },
}
