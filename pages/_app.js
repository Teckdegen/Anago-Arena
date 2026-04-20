import { useEffect } from 'react'
import '../styles/globals.css'
import { useAuth } from '../lib/useAuth'

// Season order mirrors COURT_THEMES in lib/game/config.js
const THEME_SEASONS = [
  'summer', 'summer',
  'autumn', 'autumn',
  'winter', 'winter',
  'spring', 'spring',
  'night',  'night',
]

const ALL_SEASON_CLASSES = ['summer', 'autumn', 'winter', 'spring', 'night']
  .map(s => `season-${s}`)

function getSeasonForLevel(level) {
  const n = Math.max(1, parseInt(level) || 1)
  return THEME_SEASONS[n % THEME_SEASONS.length] || 'summer'
}

function AuthGuard({ children }) {
  useAuth()
  return children
}

export default function App({ Component, pageProps }) {
  // Apply seasonal body class from stored level — updates every page navigation
  useEffect(() => {
    function applySeasonClass() {
      try {
        const lvl    = localStorage.getItem('bb_level') || '1'
        const season = getSeasonForLevel(lvl)
        document.body.classList.remove(...ALL_SEASON_CLASSES)
        document.body.classList.add(`season-${season}`)
      } catch {}
    }

    applySeasonClass()

    // Pick up level changes from other tabs (or after level-up)
    window.addEventListener('storage', applySeasonClass)
    return () => window.removeEventListener('storage', applySeasonClass)
  }, [])

  return (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  )
}
