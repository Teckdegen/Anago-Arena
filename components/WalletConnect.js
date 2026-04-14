import { useState } from 'react'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export default function WalletConnect({ onConnect, onDisconnect }) {
  const [wallet, setWallet] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function connect() {
    setError('')
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not found. Please install it.')
      return
    }
    try {
      setLoading(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setWallet(accounts[0])
      onConnect?.(accounts[0])
    } catch {
      setError('Connection rejected.')
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setWallet('')
    onDisconnect?.()
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-arcade text-xs text-green-400">✓ {shortenAddress(wallet)}</span>
        <button className="font-arcade text-xs text-gray-400 hover:text-white" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button className="btn-arcade" onClick={connect} disabled={loading}>
        {loading ? 'Connecting...' : '🦊 Connect Wallet'}
      </button>
      {error && <p className="font-arcade text-xs text-red-400">{error}</p>}
    </div>
  )
}
