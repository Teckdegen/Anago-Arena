import { useEffect } from 'react'
import { useRouter } from 'next/router'

const PUBLIC_ROUTES = ['/', '/leaderboard', '/select', '/casino', '/arena']

export function useAuth() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Allow public routes and leaderboard with game query
    if (PUBLIC_ROUTES.some(r => router.pathname === r)) return

    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
    try {
      const user = JSON.parse(saved)
      if (!user?.wallet || !user?.username) {
        localStorage.removeItem('bb_user')
        router.replace('/')
      }
    } catch {
      localStorage.removeItem('bb_user')
      router.replace('/')
    }
  }, [router.pathname])
}
