import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { mainnet, polygon, arbitrum, base } from 'wagmi/chains'
import { cookieStorage, createStorage } from 'wagmi'

// Get your projectId from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo'

const metadata = {
  name: 'BasketBattle',
  description: 'Ultimate Dog Hoop Arena',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://basketbattle.vercel.app',
  icons: [],
}

export const wagmiConfig = defaultWagmiConfig({
  chains: [mainnet, polygon, arbitrum, base],
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
})

export function initWeb3Modal() {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#5B3FDB',
      '--w3m-color-mix-strength': 40,
      '--w3m-accent': '#C17A2A',
      '--w3m-border-radius-master': '12px',
      '--w3m-font-family': '"Press Start 2P", monospace',
    },
  })
}
