import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function HomePage() {
  redirect(APP_ROUTES.AUTH.LOGIN)
}
