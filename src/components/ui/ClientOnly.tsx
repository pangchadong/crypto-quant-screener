// src/components/ui/ClientOnly.tsx
import { useEffect, useState, ReactNode } from 'react'

export default function ClientOnly({ children, fallback = '—' }: { children: ReactNode; fallback?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return <span suppressHydrationWarning>{fallback}</span>
  return <>{children}</>
}
