import api from './apiCliente'

export interface PublisherDto {
  id: number
  name: string
  contact: string
  phone: string
  email: string
  isActive: boolean
}

export interface CreatePublisherDto {
  name: string
  contact: string
  phone: string
  email: string
}

export interface UpdatePublisherDto {
  name: string
  contact: string
  phone: string
  email: string
  isActive: boolean
}

export const publisherService = {
  getAll: async (): Promise<PublisherDto[]> => {
    const { data } = await api.get<PublisherDto[]>('/api/publishers')
    return data
  },
  getById: async (id: number): Promise<PublisherDto> => {
    const { data } = await api.get<PublisherDto>(`/api/publishers/${id}`)
    return data
  },
  create: async (dto: CreatePublisherDto): Promise<PublisherDto> => {
    const { data } = await api.post<PublisherDto>('/api/publishers', dto)
    return data
  },
  update: async (id: number, dto: UpdatePublisherDto): Promise<PublisherDto> => {
    const { data } = await api.put<PublisherDto>(`/api/publishers/${id}`, dto)
    return data
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/publishers/${id}`)
  },
}
