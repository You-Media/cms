export type BannerStatus = 'Draft' | 'Active' | 'Inactive'
export type BannerModel = 'Home' | 'Article' | 'Category' | 'Search'
export type BannerPosition = 'center' | 'right' | 'left'

export interface BannerCreator {
  name: string
  email: string
  avatar: string
}

export interface Banner {
  id: number
  banner_url: string
  link: string
  position: BannerPosition
  order: number
  status: BannerStatus
  model: BannerModel
  model_id?: number
  model_title: string | null
  banner_preview: string
  created_at: string
  createdBy: BannerCreator
}

export interface FilterBannersParams {
  model?: BannerModel | null
  search?: string | null
  position?: BannerPosition | null
  status?: BannerStatus | null
  sort_by?: 'created_at' | 'order'
  sort_direction?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

export interface FilterBannersResponse {
  status: string
  message: string
  data: {
    data: Banner[]
    current_page?: number
    per_page: number
    total: number
    last_page: number
  }
}


