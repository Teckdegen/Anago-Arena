import { useEffect } from 'react'
import { useRouter } from 'next/router'

// Pages that don't require a logged-in user
const PUBLIC_ROUTES = ['/', '/leaderboard']

export function useAuth() {
  const router = useRouter()

  useEffect(() => {
    // Only runs client-side — no SSR issues
    if (PUBLIC_ROUTES.includes(router.pathname)) return

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
