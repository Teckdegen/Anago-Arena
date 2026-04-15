import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useDisconnect } from 'wagmi'
import { DogIcon, PawIcon, TrophyIcon, ArrowLeftIcon } from '../components/Icons'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

// Fetch Wars + Dog Dash removed
const GAMES = [
  {
    id: 'basketball',
    name: 'BasketBattle',
    emoji: '🏀',
    desc: 'Jump, aim & shoot. First to 100 pts wins.',
    color: '#C17A2A', shadow: '#8A4A0A', bg: 'rgba(193,122,42,0.18)',
    route: '/game',
    tag: 'ORIGINAL', tagColor: '#F0B429',
  },
  {
    id: 'football',
    name: 'Head Ball',
    emoji: '⚽',
    desc: 'Jump & head the ball into the goal. No crossing the line!',
    color: '#27AE60', shadow: '#1A6B3A', bg: 'rgba(39,174,96,0.18)',
    route: '/games/football',
    tag: 'NEW', tagColor: '#27AE60',
  },
  {
    id: 'pong',
    name: 'Paw Pong',
    emoji: '🏓',
    desc: 'Classic pong with dog paddles. 3 lives each.',
    color: '#5B3FDB', shadow: '#3A2490', bg: 'rgba(91,63,219,0.18)',
    route: '/games/pong',
    tag: 'NEW', tagColor: '#5B3FDB',
  },
  {
    id: 'catch',
    name: 'Bone Catch',
    emoji: '🦴',
    desc: 'Catch falling bones. Golden bones = 3x points!',
    color: '#E8A020', shadow: '#9A6010', bg: 'rgba(232,160,32,0.18)',
    route: '/games/catch',
    tag: 'NEW', tagColor: '#E8A020',
  },
  {
    id: 'tower',
    name: 'Bark Tower',
    emoji: '🏗️',
    desc: 'Stack falling blocks. Build the tallest tower!',
    color: '#76D7C4', shadow: '#1ABC9C', bg: 'rgba(118,215,196,0.18)',
    route: '/games/tower',
    tag: 'NEW', tagColor: '#76D7C4',
  },
]

export default function Arena() {
  const router = useRouter()
  const { disconnect } = useDisconnect()
  const [user, setUser]         = useState(null)
  const [totalPoints, setTotal] = useState(0)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
    try {
      const u = JSON.parse(saved)
      if (!u?.wallet || !u?.username) { router.replace('/'); return }
      setUser(u)
      setTotal(parseInt(localStorage.getItem('bb_points') || '0'))
    } catch { router.replace('/') }
  }, [])

  if (!mounted || !user) return null

  return (
    <>
      <Head>
        <title>ANAGO ARENA — Games</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      {/* Full-screen flex layout */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        boxSizing: 'border-box',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(30,21,64,0.95)',
          borderBottom: '3px solid #2D2D2D',
          boxShadow: '0 3px 0 #2D2D2D',
          flexShrink: 0,
        }}>
          {/* Back */}
          <button onClick={() => router.push('/select')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={28} color="#C17A2A" />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#5B3FDB', border: '3px solid #2D2D2D',
              boxShadow: '2px 2px 0 #2D2D2D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DogIcon size={26} color="#C17A2A" />
            </div>
            <div>
              <p className="font-arcade" style={{ fontSize: 'clamp(10px,2.5vw,16px)', color: '#F5EFE0', textShadow: '2px 2px 0 #2D2D2D' }}>
                ANAGO ARENA
              </p>
              <p className="font-arcade" style={{ fontSize: 6, color: '#C17A2A', letterSpacing: 2 }}>REGULAR GAMES</p>
            </div>
          </div>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p className="font-arcade" style={{ fontSize: 9, color: '#C17A2A' }}>
                <PawIcon size={10} color="#C17A2A" style={{ display: 'inline', marginRight: 3 }} />
                {user.username}
              </p>
              <p className="font-arcade" style={{ fontSize: 8, color: '#F0B429' }}>{totalPoints.toLocaleString()} pts</p>
            </div>
            <button onClick={() => router.push('/leaderboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <TrophyIcon size={24} color="#F0B429" />
            </button>
          </div>
        </div>

        {/* ── Game grid — fills remaining screen ── */}
        <div style={{
          flex: 1,
          display: 'grid',
          // On mobile: 1 col. Tablet: 2 col. Desktop: fill with equal cols
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gridAutoRows: '1fr',
          gap: 0,
          padding: 0,
        }}>
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} onClick={() => router.push(game.route)} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          textAlign: 'center',
          padding: '10px',
          background: 'rgba(30,21,64,0.8)',
          borderTop: '2px solid rgba(45,45,45,0.5)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { disconnect(); localStorage.removeItem('bb_user'); router.push('/') }}
            className="font-arcade"
            style={{ fontSize: 6, color: 'rgba(244,160,160,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </>
  )
}

function GameCard({ game, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? game.bg : 'rgba(42,30,110,0.6)',
        border: 'none',
        borderRight: '2px solid rgba(45,45,45,0.4)',
        borderBottom: '2px solid rgba(45,45,45,0.4)',
        cursor: 'pointer',
        textAlign: 'left',
        padding: 'clamp(16px, 3vw, 28px)',
        transition: 'background 0.15s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 'clamp(160px, 20vh, 260px)',
        position: 'relative',
        outline: hover ? `3px solid ${game.color}` : '3px solid transparent',
        outlineOffset: '-3px',
      }}
    >
      {/* Tag */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: game.tagColor,
        color: '#1A1008',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 6,
        padding: '3px 7px',
        borderRadius: 4,
        border: '2px solid #2D2D2D',
        boxShadow: '2px 2px 0 #2D2D2D',
      }}>
        {game.tag}
      </div>

      {/* Top: emoji + name */}
      <div>
        <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1, marginBottom: 10 }}>
          {game.emoji}
        </div>
        <p className="font-arcade" style={{
          fontSize: 'clamp(9px, 1.8vw, 13px)',
          color: '#F5EFE0',
          textShadow: '1px 1px 0 #2D2D2D',
          marginBottom: 6,
        }}>
          {game.name}
        </p>
        <p style={{
          fontFamily: 'sans-serif',
          fontSize: 'clamp(10px, 1.4vw, 13px)',
          color: 'rgba(245,239,224,0.6)',
          lineHeight: 1.5,
        }}>
          {game.desc}
        </p>
      </div>

      {/* Bottom: play bar */}
      <div style={{
        marginTop: 14,
        background: hover ? game.color : 'rgba(255,255,255,0.06)',
        border: `2px solid ${hover ? '#2D2D2D' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: hover ? `2px 2px 0 ${game.shadow}` : 'none',
        borderRadius: 8,
        padding: '7px 0',
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 8,
        color: hover ? '#F5EFE0' : 'rgba(245,239,224,0.4)',
        transition: 'all 0.12s',
      }}>
        {hover ? 'PLAY NOW →' : 'PLAY →'}
      </div>
    </button>
  )
}
