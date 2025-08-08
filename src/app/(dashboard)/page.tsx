import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function DashboardRedirect() {
  redirect(APP_ROUTES.DASHBOARD.HOME)
}
