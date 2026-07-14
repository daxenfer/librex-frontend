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
  quantities: number[]
  totalQuantity: number
}

export interface SalesByProductReport {
  supplierId: number | null
  supplierName: string
  products: ProductColumn[]
  rows: CustomerProductRow[]
  productTotals: number[]
  grandTotal: number
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
}
