import api from './apiCliente'

export interface ProductDto {
  id: number
  name: string
  publisherId: number
  publisherName: string
  isActive: boolean
}

export interface CreateProductDto {
  name: string
  publisherId: number
}

export interface UpdateProductDto {
  name: string
  publisherId: number
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
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/products/${id}`)
  },
}
