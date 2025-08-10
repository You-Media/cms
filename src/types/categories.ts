export interface Category {
  id: number
  title: string
  slug: string
  parent_id: number | null
  created_at: string
  updated_at: string
  // Facoltativo, non sempre presente in risposta
  articles_count?: number
  parent?: {
    id: number
    title: string
    slug: string
    parent_id: number | null
    created_at: string
    updated_at: string
  } | null
}

export interface CategoriesSearchParams {
  page?: number | null
  per_page?: number | null
  parent_id?: number | null
  search?: string | null
}

export interface CategoriesSearchResponse {
  status: string
  message: string
  data: {
    data: Category[]
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

export interface CreateCategoryPayload {
  title: string
  slug?: string | null // il backend lo accetta, ma UI non deve consentire modifica
  parent_id?: number | null
}

export interface UpdateCategoryPayload {
  title?: string
  slug?: string | null
  parent_id?: number | null
}

export interface CategoryTreeNode {
  id: number
  title: string
  slug: string
  parent_id: number | null
  depth: number
}

export interface CategoryTreeEdge {
  source: number
  target: number
}

export interface CategoryTreeResponse {
  status: string
  message: string
  data: {
    nodes: CategoryTreeNode[]
    edges: CategoryTreeEdge[]
  }
}

