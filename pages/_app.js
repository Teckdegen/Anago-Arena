import '../styles/globals.css'
import { useAuth } from '../lib/useAuth'

function AuthGuard({ children }) {
  useAuth()
  return children
}

export default function App({ Component, pageProps }) {
  return (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  )
}
