import type { Metadata } from 'next'
import { SentryProvider } from '@/components/SentryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'bwave – Product Wave',
  description: 'Turn supplier PDFs into Shopify-ready CSVs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black">
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  )
}
