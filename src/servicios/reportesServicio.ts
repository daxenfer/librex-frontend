import api from './apiCliente'

export interface CustomerReportRow {
  customerId: number
  customerName: string
  totalSales: number
  totalReturns: number
  totalPayments: number
  balance: number
}

export interface SupplierReport {
  supplierId: number | null
  supplierName: string
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
  quantitiesSold: number[]
  quantitiesReturned: number[]
  totalSold: number
  totalReturned: number
}

export interface SalesByProductReport {
  supplierId: number | null
  supplierName: string
  products: ProductColumn[]
  rows: CustomerProductRow[]
  productTotalsSold: number[]
  productTotalsReturned: number[]
  grandTotalSold: number
  grandTotalReturned: number
}

export interface UnallocatedPaymentRow {
  customerId: number
  customerName: string
  totalPayments: number
  allocatedAmount: number
  unallocatedAmount: number
}

export interface UnallocatedPaymentsReport {
  rows: UnallocatedPaymentRow[]
  totalUnallocated: number
}

export const reportService = {
  getBySupplier: async (supplierId?: number): Promise<SupplierReport> => {
    const params = supplierId ? `?supplierId=${supplierId}` : ''
    const { data } = await api.get<SupplierReport>(`/api/reports/by-supplier${params}`)
    return data
  },
  getSalesByProduct: async (supplierId?: number): Promise<SalesByProductReport> => {
    const params = supplierId ? `?supplierId=${supplierId}` : ''
    const { data } = await api.get<SalesByProductReport>(`/api/reports/sales-by-product${params}`)
    return data
  },
  getUnallocatedPayments: async (): Promise<UnallocatedPaymentsReport> => {
    const { data } = await api.get<UnallocatedPaymentsReport>('/api/reports/unallocated-payments')
    return data
  },
}
