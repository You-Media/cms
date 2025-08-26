export type ArticleStatus =
  | 'draft'
  | 'published'
  | 'revision'
  | 'unpublished'
  | 'archived'
  | 'approved'
  | 'rejected'

export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: 'Bozza',
  published: 'Pubblicato',
  revision: 'Revisione',
  unpublished: 'Depubblicato',
  archived: 'Archiviato',
  approved: 'Approvato',
  rejected: 'Rifiutato',
}

export function isArticleStatus(value: string | undefined | null): value is ArticleStatus {
  return (
    value === 'draft' ||
    value === 'published' ||
    value === 'revision' ||
    value === 'unpublished' ||
    value === 'archived' ||
    value === 'approved' ||
    value === 'rejected'
  )
}

export function statusColorClass(status?: ArticleStatus): string {
  switch (status) {
    case 'published':
      return 'bg-green-500'
    case 'draft':
      return 'bg-gray-400'
    case 'revision':
      return 'bg-amber-500'
    case 'unpublished':
      return 'bg-slate-400'
    case 'archived':
      return 'bg-zinc-500'
    case 'approved':
      return 'bg-blue-500'
    case 'rejected':
      return 'bg-red-500'
    default:
      return 'bg-gray-300 dark:bg-gray-600'
  }
}


