import api from './apiCliente'

export interface UserDto {
  id: number
  username: string
  fullName: string
  role: string
  createdAt: string
}

export interface CreateUserDto {
  username: string
  fullName: string
  role: string
  password: string
}

export interface UpdateUserDto {
  username: string
  fullName: string
  role: string
}

// La matriz de autorización tal como está compilada en el backend: de solo lectura.
export interface PermissionMatrixDto {
  roles: string[]
  permissions: string[]
  grants: Record<string, string[]>
}

export interface ChangePasswordDto {
  newPassword: string
}

const BASE = '/api/users'

export const userService = {
  async getAll(): Promise<UserDto[]> {
    const response = await api.get<UserDto[]>(BASE)
    return response.data
  },

  async getPermissionMatrix(): Promise<PermissionMatrixDto> {
    const response = await api.get<PermissionMatrixDto>(`${BASE}/permission-matrix`)
    return response.data
  },

  async create(data: CreateUserDto): Promise<UserDto> {
    const response = await api.post<UserDto>(BASE, data)
    return response.data
  },

  async update(id: number, data: UpdateUserDto): Promise<UserDto> {
    const response = await api.put<UserDto>(`${BASE}/${id}`, data)
    return response.data
  },

  async changePassword(id: number, data: ChangePasswordDto): Promise<void> {
    await api.put(`${BASE}/${id}/password`, data)
  },

  async delete(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`)
  },
}
