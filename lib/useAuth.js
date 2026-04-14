import { useEffect } from 'react'
import { useRouter } from 'next/router'

// Public routes that don't require login
const PUBLIC_ROUTES = ['/', '/leaderboard']

export function useAuth() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (PUBLIC_ROUTES.includes(router.pathname)) return

    const saved = localStorage.getItem('bb_user')
    if (!saved) {
      router.replace('/')
      return
    }
    try {
      const user = JSON.parse(saved)
      if (!user?.wallet || !user?.username) {
        router.replace('/')
      }
    } catch {
      localStorage.removeItem('bb_user')
      router.replace('/')
    }
  }, [router.pathname])
}
