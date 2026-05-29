import api from './apiCliente'

export interface CustomerDto {
  id: number
  name: string
  address: string
  postalCode: string
  phone: string
  city: string
  isActive: boolean
}

export interface CreateCustomerDto {
  name: string
  address: string
  postalCode: string
  phone: string
  city: string
}

export interface UpdateCustomerDto {
  name: string
  address: string
  postalCode: string
  phone: string
  city: string
  isActive: boolean
}

export const customerService = {
  getAll: async (): Promise<CustomerDto[]> => {
    const { data } = await api.get<CustomerDto[]>('/api/customers')
    return data
  },
  getById: async (id: number): Promise<CustomerDto> => {
    const { data } = await api.get<CustomerDto>(`/api/customers/${id}`)
    return data
  },
  create: async (dto: CreateCustomerDto): Promise<CustomerDto> => {
    const { data } = await api.post<CustomerDto>('/api/customers', dto)
    return data
  },
  update: async (id: number, dto: UpdateCustomerDto): Promise<CustomerDto> => {
    const { data } = await api.put<CustomerDto>(`/api/customers/${id}`, dto)
    return data
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/customers/${id}`)
  },
}
