import axios from 'axios'
import { authService } from './authServicio'

const api = axios.create()

api.interceptors.request.use(config => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface CompanySettingsDto {
  companyName: string
  brandName: string
  rfc: string
  phone1?: string
  phone2?: string
  email?: string
  address?: string
  postalCode?: string
  city?: string
  state?: string
}

export const settingsService = {
  get: async (): Promise<CompanySettingsDto> => {
    const { data } = await api.get<CompanySettingsDto>('/api/settings')
    return data
  },
  update: async (dto: CompanySettingsDto): Promise<CompanySettingsDto> => {
    const { data } = await api.put<CompanySettingsDto>('/api/settings', dto)
    return data
  },
}
