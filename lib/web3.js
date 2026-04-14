import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, arbitrum, base } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'BasketBattle',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [mainnet, polygon, arbitrum, base],
  ssr: true,
})
