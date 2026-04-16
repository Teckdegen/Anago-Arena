import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { upsertUser } from '../lib/supabase'
import { DogIcon, PawIcon, TrophyIcon, AlertIcon, LoaderIcon, BasketballIcon } from '../components/Icons'

const FLOATERS = [
  { Icon: BasketballIcon, color: '#C17A2A', size: 28 },
  { Icon: PawIcon,        color: '#F4A0A0', size: 22 },
  { Icon: BasketballIcon, color: '#F0B429', size: 32 },
  { Icon: PawIcon,        color: '#C17A2A', size: 20 },
  { Icon: BasketballIcon, color: '#C17A2A', size: 26 },
]

function isValidWallet(addr) {
  // Accept ETH (0x...) or any non-empty string as wallet address
  return addr.trim().length >= 8
}

export default function Landing() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [wallet, setWallet]     = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bb_user')
    if (saved) {
      try {
        const u = JSON.parse(saved)
        if (u?.wallet && u?.username) { router.replace('/select'); return }
      } catch {}
    }
  }, [])

  async function handlePlay() {
    const trimmedName   = username.trim()
    const trimmedWallet = wallet.trim().toLowerCase()

    if (trimmedName.length < 3)  { setError('Username: min 3 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) { setError('Username: letters, numbers, underscore only.'); return }
    if (!isValidWallet(trimmedWallet)) { setError('Enter a valid wallet address.'); return }

    setLoading(true)
    setError('')

    const { error: dbError } = await upsertUser(trimmedWallet, trimmedName)
    if (dbError && dbError.code === '23505') {
      // Username taken — check if it's the same wallet (returning user)
      setError('Username taken. Try another.')
      setLoading(false)
      return
    }

    localStorage.setItem('bb_user', JSON.stringify({ wallet: trimmedWallet, username: trimmedName }))
    if (!localStorage.getItem('bb_level'))  localStorage.setItem('bb_level', '1')
    if (!localStorage.getItem('bb_points')) localStorage.setItem('bb_points', '0')
    router.push('/select')
  }

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>ANAGO ARENA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      {/* Floating icons */}
      {FLOATERS.map(({ Icon, color, size }, i) => (
        <span key={i} className="float-ball select-none" style={{
          left: `${6 + i * 18}%`, bottom: '-5%',
          animationDuration: `${7 + i * 1.8}s`,
          animationDelay: `${i * 1.2}s`,
          display: 'inline-flex', alignItems: 'center',
        }}>
          <Icon size={size} color={color} />
        </span>
      ))}

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#5B3FDB', border: '4px solid #2D2D2D',
            boxShadow: '4px 4px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <DogIcon size={58} color="#C17A2A" />
          </div>
          <h1 className="font-arcade" style={{
            fontSize: 'clamp(16px, 5vw, 28px)', color: '#F5EFE0',
            textShadow: '3px 3px 0 #2D2D2D, -1px -1px 0 #2D2D2D, 1px -1px 0 #2D2D2D, -1px 1px 0 #2D2D2D',
            letterSpacing: 2,
          }}>
            ANAGO ARENA
          </h1>
          <p className="font-arcade mt-2" style={{ fontSize: 8, color: '#C17A2A', letterSpacing: 3 }}>
            ULTIMATE DOG SPORTS ARENA
          </p>
          <div style={{ margin: '10px auto 0', width: 100, height: 3, background: 'linear-gradient(90deg, transparent, #C17A2A, transparent)', borderRadius: 2 }} />
        </div>

        {/* Card */}
        <div className="cartoon-card w-full" style={{ maxWidth: 380, padding: '28px 24px' }}>
          <div className="flex flex-col gap-5 items-center">

            <p className="font-arcade text-center leading-7" style={{ fontSize: 10, color: '#F5EFE0' }}>
              Enter your details to play
            </p>

            {/* Dog avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#5B3FDB', border: '3px solid #2D2D2D',
              boxShadow: '3px 3px 0 #2D2D2D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DogIcon size={36} color="#C17A2A" />
            </div>

            {/* Username */}
            <div style={{ width: '100%' }}>
              <p className="font-arcade mb-2" style={{ fontSize: 7, color: '#C17A2A' }}>USERNAME</p>
              <input
                className="arcade-input"
                type="text"
                placeholder="Your dog name (3-12 chars)"
                maxLength={12}
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlay()}
                autoFocus
              />
            </div>

            {/* Wallet address */}
            <div style={{ width: '100%' }}>
              <p className="font-arcade mb-2" style={{ fontSize: 7, color: '#C17A2A' }}>WALLET ADDRESS</p>
              <input
                className="arcade-input"
                type="text"
                placeholder="0x... or your wallet address"
                value={wallet}
                onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlay()}
                style={{ fontSize: 9 }}
              />
              <p style={{ fontFamily: 'sans-serif', fontSize: 10, color: 'rgba(245,239,224,0.4)', marginTop: 4, textAlign: 'center' }}>
                Your score is tied to this address
              </p>
            </div>

            <button
              className="btn-arcade gold w-full"
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handlePlay}
              disabled={loading || username.trim().length < 3 || wallet.trim().length < 8}
            >
              {loading
                ? <><LoaderIcon size={14} color="currentColor" /> Saving...</>
                : <><PawIcon size={14} color="#2D2D2D" /> ENTER ARENA</>
              }
            </button>

            {error && (
              <p className="font-arcade text-center" style={{
                fontSize: 8, color: '#E05050',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <AlertIcon size={12} color="#E05050" /> {error}
              </p>
            )}
          </div>
        </div>

        <a href="/leaderboard" className="mt-6 font-arcade" style={{
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
