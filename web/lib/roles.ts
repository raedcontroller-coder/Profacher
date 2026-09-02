export const ROLES = {
  ADMIN: "ADMIN",
  COORDINATOR: "COORDINATOR",
  PROFESSOR: "PROFESSOR",
  STUDENT: "STUDENT",
} as const

export type RoleName = typeof ROLES[keyof typeof ROLES]

export function isRole(roleName: string | undefined | null, role: RoleName): boolean {
  return roleName === role
}
