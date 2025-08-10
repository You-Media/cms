export interface Tag {
  id: number
  name: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
}

export interface CreateTagRequest {
  name: string
  description?: string
}

export interface UpdateTagRequest {
  name: string
  description?: string
}

export interface TagsResponse {
  data: Tag[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

