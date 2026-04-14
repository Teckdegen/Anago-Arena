import '@rainbow-me/rainbowkit/styles.css'
import '../styles/globals.css'

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../lib/web3'
import { useAuth } from '../lib/useAuth'

const queryClient = new QueryClient()

function AuthGuard({ children }) {
  useAuth()
  return children
}

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#C17A2A',
            accentColorForeground: '#F5EFE0',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          appInfo={{ appName: 'BasketBattle' }}
        >
          <AuthGuard>
            <Component {...pageProps} />
          </AuthGuard>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
