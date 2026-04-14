import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect } from 'wagmi'
import { upsertUser } from '../lib/supabase'
import {
  DogIcon, WalletIcon, PawIcon, TrophyIcon,
  CheckIcon, AlertIcon, LoaderIcon, BasketballIcon,
} from '../components/Icons'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

const FLOATERS = [
  { Icon: BasketballIcon, color: '#C17A2A', size: 28 },
  { Icon: PawIcon,        color: '#F4A0A0', size: 22 },
  { Icon: BasketballIcon, color: '#F0B429', size: 32 },
  { Icon: PawIcon,        color: '#C17A2A', size: 20 },
  { Icon: BasketballIcon, color: '#C17A2A', size: 26 },
]

export default function Landing() {
  const router = useRouter()
  const { open } = useWeb3Modal()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const [username, setUsername] = useState('')
  const [step, setStep] = useState('connect')   // 'connect' | 'username'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, skip to menu
  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) {
      try {
        const u = JSON.parse(saved)
        if (u?.wallet && u?.username) { router.replace('/menu'); return }
      } catch {}
    }
  }, [])

  // When wallet connects, move to username step
  useEffect(() => {
    if (isConnected && address && step === 'connect') {
      setStep('username')
      setError('')
    }
    if (!isConnected && step === 'username') {
      setStep('connect')
    }
  }, [isConnected, address])

  async function handlePlay() {
    const trimmed = username.trim()
    if (trimmed.length < 3) { setError('Min 3 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setError('Letters, numbers, underscore only.'); return }
    if (!address) { setError('Wallet not connected.'); return }

    setLoading(true)
    setError('')

    const { error: dbError } = await upsertUser(address, trimmed)
    if (dbError && dbError.code === '23505') {
      setError('Username taken. Try another.')
      setLoading(false)
      return
    }

    localStorage.setItem('bb_user', JSON.stringify({ wallet: address, username: trimmed }))
    if (!localStorage.getItem('bb_level'))  localStorage.setItem('bb_level', '1')
    if (!localStorage.getItem('bb_points')) localStorage.setItem('bb_points', '0')
    router.push('/menu')
  }

  function handleDisconnect() {
    disconnect()
    setStep('connect')
    setUsername('')
    setError('')
  }

  return (
    <>
      <Head>
        <title>BasketBattle</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      {/* Floating icons */}
      {FLOATERS.map(({ Icon, color, size }, i) => (
        <span key={i} className="float-ball select-none" style={{
          left: `${6 + i * 18}%`,
          bottom: '-5%',
          animationDuration: `${7 + i * 1.8}s`,
          animationDelay: `${i * 1.2}s`,
          display: 'inline-flex',
          alignItems: 'center',
        }}>
          <Icon size={size} color={color} />
        </span>
      ))}

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            width: 96, height: 96,
            borderRadius: '50%',
            background: '#5B3FDB',
            border: '4px solid #2D2D2D',
            boxShadow: '4px 4px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <DogIcon size={58} color="#C17A2A" />
          </div>
          <h1 className="font-arcade" style={{
            fontSize: 'clamp(16px, 5vw, 28px)',
            color: '#F5EFE0',
            textShadow: '3px 3px 0 #2D2D2D, -1px -1px 0 #2D2D2D, 1px -1px 0 #2D2D2D, -1px 1px 0 #2D2D2D',
            letterSpacing: 2,
          }}>
            BasketBattle
          </h1>
          <p className="font-arcade mt-2" style={{ fontSize: 8, color: '#C17A2A', letterSpacing: 3 }}>
            ULTIMATE DOG HOOP ARENA
          </p>
          <div style={{
            margin: '10px auto 0', width: 100, height: 3,
            background: 'linear-gradient(90deg, transparent, #C17A2A, transparent)',
            borderRadius: 2,
          }} />
        </div>

        {/* Card */}
        <div className="cartoon-card w-full" style={{ maxWidth: 360, padding: '28px 24px' }}>

          {/* ── STEP 1: Connect wallet ── */}
          {step === 'connect' && (
            <div className="flex flex-col gap-5 items-center">
              <p className="font-arcade text-center leading-7" style={{ fontSize: 10, color: '#F5EFE0' }}>
                Connect your wallet to enter the arena
              </p>

              {/* Web3Modal button — opens the modal with all wallet options */}
              <button
                className="btn-arcade w-full"
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => open()}
                disabled={loading}
              >
                <WalletIcon size={18} color="currentColor" /> Connect Wallet
              </button>

              <div className="paw-divider w-full">
                <PawIcon size={16} color="#C17A2A" />
              </div>

              <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: 'rgba(245,239,224,0.6)', textAlign: 'center', lineHeight: 1.7 }}>
                MetaMask, WalletConnect, Coinbase<br/>and 300+ wallets supported.
              </p>
            </div>
          )}

          {/* ── STEP 2: Pick username ── */}
          {step === 'username' && (
            <div className="flex flex-col gap-5 items-center">
              {/* Connected badge */}
              <div style={{
                background: 'rgba(193,122,42,0.15)',
                border: '3px solid #2D2D2D',
                borderRadius: 10,
                boxShadow: '3px 3px 0 #2D2D2D',
                padding: '8px 14px',
                textAlign: 'center',
                width: '100%',
              }}>
                <p className="font-arcade" style={{
                  fontSize: 9, color: '#27AE60',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <CheckIcon size={14} color="#27AE60" /> Wallet Connected
                </p>
                <p className="font-arcade mt-1" style={{ fontSize: 8, color: '#F4A0A0' }}>
                  {shortenAddress(address)}
                </p>
              </div>

              <p className="font-arcade text-center" style={{ fontSize: 10, color: '#F5EFE0' }}>
                Name your dog
              </p>

              <div style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: '#5B3FDB',
                border: '3px solid #2D2D2D',
                boxShadow: '3px 3px 0 #2D2D2D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DogIcon size={40} color="#C17A2A" />
              </div>

              <input
                className="arcade-input"
                type="text"
                placeholder="Enter name (3-12 chars)"
                maxLength={12}
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlay()}
                autoFocus
              />

              <button
                className="btn-arcade gold w-full"
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handlePlay}
                disabled={loading || username.trim().length < 3}
              >
                {loading
                  ? <><LoaderIcon size={14} color="currentColor" /> Saving...</>
                  : <><PawIcon size={14} color="#2D2D2D" /> ENTER ARENA</>
                }
              </button>

              <button
                onClick={handleDisconnect}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 7, color: 'rgba(244,160,160,0.5)',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                Use different wallet
              </button>
            </div>
          )}

          {error && (
            <p className="font-arcade text-center mt-4" style={{
              fontSize: 9, color: '#E05050',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <AlertIcon size={12} color="#E05050" /> {error}
            </p>
          )}
        </div>

        <a
          href="/leaderboard"
          className="mt-6 font-arcade"
          style={{
            fontSize: 8, color: 'rgba(193,122,42,0.5)',
            display: 'flex', alignItems: 'center', gap: 5,
            textDecoration: 'none', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(193,122,42,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(193,122,42,0.5)'}
        >
          <TrophyIcon size={12} color="currentColor" /> View Leaderboard
        </a>
      </div>
    </>
  )
}
