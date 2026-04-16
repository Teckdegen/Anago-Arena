import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useDisconnect } from 'wagmi'
import { DogIcon, PawIcon, TrophyIcon, ArrowLeftIcon } from '../components/Icons'
import HowToPlay from '../components/HowToPlay'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

const GAMES = [
  {
    id: 'basketball',
    name: 'BasketBattle',
    emoji: '🏀',
    desc: '2.5D drag-to-shoot. One hoop, two balls. Tap to jump, drag to aim, release to shoot. First to 100 pts!',
    color: '#C17A2A', shadow: '#8A4A0A', accent: 'rgba(193,122,42,0.2)',
    route: '/game', tag: 'ORIGINAL', tagColor: '#F0B429',
    features: ['VS AI', 'PVP', 'LEVELS'],
  },
]

export default function Arena() {
  const router = useRouter()
  const { disconnect } = useDisconnect()
  const [user, setUser]         = useState(null)
  const [totalPoints, setTotal] = useState(0)
  const [mounted, setMounted]   = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)

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
        <title>ANAGO ARENA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(20,12,50,0.98)',
          borderBottom: '3px solid #2D2D2D',
          boxShadow: '0 3px 0 #2D2D2D',
          flexShrink: 0,
        }}>
          <button onClick={() => router.push('/select')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeftIcon size={28} color="#C17A2A" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: '#5B3FDB', border: '3px solid #2D2D2D',
              boxShadow: '3px 3px 0 #2D2D2D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DogIcon size={28} color="#C17A2A" />
            </div>
            <div>
              <p className="font-arcade" style={{ fontSize: 'clamp(11px,2.5vw,17px)', color: '#F5EFE0', textShadow: '2px 2px 0 #2D2D2D' }}>
                ANAGO ARENA
              </p>
              <p className="font-arcade" style={{ fontSize: 6, color: '#C17A2A', letterSpacing: 2 }}>PICK YOUR GAME</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p className="font-arcade" style={{ fontSize: 9, color: '#C17A2A', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                <PawIcon size={10} color="#C17A2A" /> {user.username}
              </p>
              <p className="font-arcade" style={{ fontSize: 8, color: '#F0B429' }}>{totalPoints.toLocaleString()} pts</p>
            </div>
            <button onClick={() => router.push('/leaderboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <TrophyIcon size={26} color="#F0B429" />
            </button>
            <button
              onClick={() => setShowHowTo(true)}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 7, color: '#F5EFE0',
                background: 'rgba(91,63,219,0.5)',
                border: '2px solid #2D2D2D',
                borderRadius: 6, padding: '5px 8px',
                cursor: 'pointer',
              }}
            >
              ?
            </button>
          </div>
        </div>

        {/* ── Hero section ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 48px)',
          gap: 'clamp(16px, 3vw, 32px)',
        }}>

          {/* Subtitle */}
          <p className="font-arcade" style={{
            fontSize: 'clamp(7px, 1.5vw, 10px)',
            color: 'rgba(245,239,224,0.45)',
            letterSpacing: 3,
            textAlign: 'center',
          }}>
            2 GAMES · VS AI · PVP · LEADERBOARD
          </p>

          {/* Game cards — side by side on desktop, stacked on mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 'clamp(14px, 3vw, 28px)',
            width: '100%',
            maxWidth: 860,
          }}>
            {GAMES.map(game => (
              <GameCard key={game.id} game={game} onClick={() => router.push(game.route)} />
            ))}
          </div>

          {/* Wallet strip */}
          <div style={{
            background: 'rgba(42,30,110,0.5)',
            border: '2px solid rgba(91,63,219,0.3)',
            borderRadius: 10,
            padding: '8px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <PawIcon size={12} color="rgba(193,122,42,0.6)" />
            <span className="font-arcade" style={{ fontSize: 7, color: 'rgba(244,160,160,0.5)' }}>
              {shortenAddress(user.wallet)}
            </span>
            <button
              onClick={() => { disconnect(); localStorage.removeItem('bb_user'); router.push('/') }}
              className="font-arcade"
              style={{ fontSize: 6, color: 'rgba(244,160,160,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
            >
              DISCONNECT
            </button>
          </div>
        </div>
      </div>
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
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
        background: hover ? game.accent : 'rgba(30,20,70,0.85)',
        border: `4px solid ${hover ? game.color : '#2D2D2D'}`,
        borderRadius: 20,
        boxShadow: hover
          ? `6px 6px 0 ${game.shadow}, 0 0 40px ${game.accent}`
          : '5px 5px 0 #2D2D2D',
        padding: 'clamp(20px, 3vw, 32px)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.14s',
        transform: hover ? 'translateY(-4px)' : 'none',
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Tag */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: game.tagColor,
        color: '#1A1008',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 7,
        padding: '4px 9px',
        borderRadius: 6,
        border: '2px solid #2D2D2D',
        boxShadow: '2px 2px 0 #2D2D2D',
      }}>
        {game.tag}
      </div>

      {/* Emoji + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 'clamp(56px, 8vw, 80px)',
          height: 'clamp(56px, 8vw, 80px)',
          borderRadius: '50%',
          background: hover ? game.color : 'rgba(42,30,110,0.8)',
          border: `3px solid ${hover ? '#2D2D2D' : 'rgba(45,45,45,0.6)'}`,
          boxShadow: hover ? '3px 3px 0 #2D2D2D' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          flexShrink: 0,
          transition: 'all 0.14s',
        }}>
          {game.emoji}
        </div>
        <div>
          <p className="font-arcade" style={{
            fontSize: 'clamp(12px, 2.2vw, 18px)',
            color: hover ? game.color : '#F5EFE0',
            textShadow: '2px 2px 0 #2D2D2D',
            marginBottom: 4,
            transition: 'color 0.14s',
          }}>
            {game.name}
          </p>
          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {game.features.map(f => (
              <span key={f} style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 6,
                padding: '2px 7px',
                borderRadius: 4,
                background: 'rgba(91,63,219,0.35)',
                border: '1px solid rgba(91,63,219,0.5)',
                color: 'rgba(245,239,224,0.7)',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        fontFamily: 'sans-serif',
        fontSize: 'clamp(11px, 1.5vw, 14px)',
        color: 'rgba(245,239,224,0.65)',
        lineHeight: 1.6,
      }}>
        {game.desc}
      </p>

      {/* Play button */}
      <div style={{
        background: hover ? game.color : 'rgba(255,255,255,0.07)',
        border: `3px solid ${hover ? '#2D2D2D' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: hover ? `3px 3px 0 ${game.shadow}` : 'none',
        borderRadius: 10,
        padding: '10px 0',
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 10,
        color: hover ? '#F5EFE0' : 'rgba(245,239,224,0.35)',
        transition: 'all 0.14s',
        letterSpacing: 1,
      }}>
        {hover ? '▶  PLAY NOW' : 'PLAY →'}
      </div>
    </button>
  )
}
