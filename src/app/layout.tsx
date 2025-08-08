import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeToggle } from '@/components/theme-toggle'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CMS Multi-Sito',
  description: 'Sistema di gestione contenuti multi-sito',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" data-theme="dark">
      <body className={inter.className}>
        {children}
        <ThemeToggle />
        <ToastProvider />
      </body>
    </html>
  )
}
