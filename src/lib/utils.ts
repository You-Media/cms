import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a UTC date string to local datetime-local format
 * This fixes the timezone issue where dates appear 2 hours earlier
 */
export function utcToLocalDatetime(utcDateString: string | null | undefined): string {
  if (!utcDateString) return ''
  
  try {
    // Create date object from UTC string
    const utcDate = new Date(utcDateString)
    
    // Check if date is valid
    if (Number.isNaN(utcDate.getTime())) return ''
    
    // Convert to local timezone and format for datetime-local input
    // datetime-local expects format: YYYY-MM-DDTHH:MM
    const year = utcDate.getFullYear()
    const month = String(utcDate.getMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getDate()).padStart(2, '0')
    const hours = String(utcDate.getHours()).padStart(2, '0')
    const minutes = String(utcDate.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch {
    return ''
  }
}
