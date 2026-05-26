import axios from 'axios'
import { authService } from './authServicio'

const api = axios.create()

api.interceptors.request.use(config => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface RemissionDetailDto {
  id: number
  productId: number
  productName: string
  publisherName?: string
  city?: string
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
  date: string
  salesPerson?: string
  notes?: string
  recipientName?: string
  discount: number
  subtotal: number
  total: number
  isActive: boolean
  details: RemissionDetailDto[]
}

export interface CreateRemissionDetailDto {
  productId: number
  city?: string
  quantity: number
  unitPrice: number
}

export interface CreateRemissionDto {
  customerId: number
  date: string
  salesPerson?: string
  notes?: string
  recipientName?: string
  discount: number
  details: CreateRemissionDetailDto[]
}

export interface UpdateRemissionDto extends CreateRemissionDto {
  isActive: boolean
}

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
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/remissions/${id}`)
  },
}
