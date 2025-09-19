export type ContactType = 'contact' | 'work_with_us'

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  contact: 'Richiesta di contatto',
  work_with_us: 'Lavora con noi',
}

export function isContactType(value: string | undefined | null): value is ContactType {
  return value === 'contact' || value === 'work_with_us'
}

export function contactTypeColorClass(type?: ContactType): string {
  switch (type) {
    case 'contact':
      return 'bg-blue-500'
    case 'work_with_us':
      return 'bg-green-500'
    default:
      return 'bg-gray-300 dark:bg-gray-600'
  }
}

export function contactTypeBadgeClass(type?: ContactType): string {
  switch (type) {
    case 'contact':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'work_with_us':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

export type Contact = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone?: string
  notes?: string
  type: ContactType
  created_at?: string
  updated_at?: string
  extra?: Record<string, any>
  file?: {
    path: string
    name: string
    url: string
  }
}
