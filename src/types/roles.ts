export type UserRoleFilter = 'EditorInChief' | 'Publisher' | 'AdvertisingManager' | 'Journalist' | 'Consumer' | 'Admin' | 'SuperAdmin'

export const ROLE_LABEL_IT: Record<string, string> = {
  EditorInChief: 'Caporedattore',
  Publisher: 'Editore',
  AdvertisingManager: 'Manager Pubblicità',
  Journalist: 'Giornalista',
  Consumer: 'Lettore',
  Admin: 'Amministratore',
  SuperAdmin: 'Super Amministratore',
}

export function roleLabelIt(role: string): string {
  return ROLE_LABEL_IT[role] || role
}


