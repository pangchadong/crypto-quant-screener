// src/pages/_app.tsx
import type { AppProps } from 'next/app'
import { Toaster } from 'react-hot-toast'
import Layout from '@/components/ui/Layout'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div suppressHydrationWarning>
      <Layout>
        <Component {...pageProps} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#F9FAFB',
              border: '1px solid #1F2937',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#111827' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
          }}
        />
      </Layout>
    </div>
  )
}
