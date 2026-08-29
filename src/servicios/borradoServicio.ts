import api from './apiCliente'

export interface DeletionImpactItemDto {
  entityName: string
  count: number
}

// Lo que el backend se va a llevar en cascada al borrar una entidad.
export interface DeletionImpactDto {
  entityType: string
  id: number
  label: string
  items: DeletionImpactItemDto[]
  totalDependents: number
}

// Rutas de la API con borrado en cascada. Cada servicio arma su propio getDeletionImpact
// con esta función, para que las páginas nunca construyan URLs.
export type DeletableResource =
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'remissions'
  | 'returns'
  | 'payments'

export const fetchDeletionImpact = async (
  resource: DeletableResource,
  id: number,
): Promise<DeletionImpactDto> => {
  const { data } = await api.get<DeletionImpactDto>(`/api/${resource}/${id}/deletion-impact`)
  return data
}
