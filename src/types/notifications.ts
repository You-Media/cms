export type NotificationActor = {
  id: number
  name: string
  avatar?: string
}

export type NotificationItem = {
  id: string
  type: string
  message: string
  actor: NotificationActor | null
  actor_id?: number
  actor_name?: string
  subject_id?: number
  subject_entity?: string
  subject_title?: string
  read_at: string | null
  created_at: string | null
}

export type NotificationsIndexResponse = {
  data: NotificationItem[]
  meta: {
    current_page: string
    per_page: string
    total: string
    last_page: string
  }
}


