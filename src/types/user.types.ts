import type { UserRole } from './enums'

export interface AdminUser {
  id: number
  email: string
  name: string
  password?: string
  role: UserRole
  locationId: number
  locationName: string
  permissions: string[]
  createdAt: string
  lastLoginAt: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}
