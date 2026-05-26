import axios from 'axios'
import { authService } from './authServicio'

const api = axios.create()

api.interceptors.request.use(config => {
  const token = authService.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface CustomerReportRow {
  customerId: number
  customerName: string
  totalSales: number
  totalReturns: number
  totalPayments: number
  balance: number
}

export interface PublisherReport {
  publisherId: number | null
  publisherName: string
  customers: CustomerReportRow[]
  totals: CustomerReportRow
}

export interface ProductColumn {
  productId: number
  productName: string
}

export interface CustomerProductRow {
  customerId: number
  customerName: string
  quantities: number[]
  totalQuantity: number
}

export interface SalesByProductReport {
  publisherId: number | null
  publisherName: string
  products: ProductColumn[]
  rows: CustomerProductRow[]
  productTotals: number[]
  grandTotal: number
}

export const reportService = {
  getByPublisher: async (publisherId?: number): Promise<PublisherReport> => {
    const params = publisherId ? `?publisherId=${publisherId}` : ''
    const { data } = await api.get<PublisherReport>(`/api/reports/by-publisher${params}`)
    return data
  },
  getSalesByProduct: async (publisherId?: number): Promise<SalesByProductReport> => {
    const params = publisherId ? `?publisherId=${publisherId}` : ''
    const { data } = await api.get<SalesByProductReport>(`/api/reports/sales-by-product${params}`)
    return data
  },
}
