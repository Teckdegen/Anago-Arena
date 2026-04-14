import { useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../styles/globals.css'
import { wagmiConfig, initWeb3Modal } from '../lib/web3'
import { useAuth } from '../lib/useAuth'

const queryClient = new QueryClient()

// Init Web3Modal once (client-side only)
if (typeof window !== 'undefined') {
  initWeb3Modal()
}

function AuthGuard({ children }) {
  useAuth()
  return children
}

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Component {...pageProps} />
        </AuthGuard>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
