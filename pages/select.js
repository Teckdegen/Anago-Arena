import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useDisconnect } from 'wagmi'
import { DogIcon, PawIcon } from '../components/Icons'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export default function SelectMode() {
  const router   = useRouter()
  const { disconnect } = useDisconnect()
  const [user, setUser]     = useState(null)
  const [mounted, setMounted] = useState(false)
  const [hover, setHover]   = useState(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
    try {
      const u = JSON.parse(saved)
      if (!u?.wallet || !u?.username) { router.replace('/'); return }
      setUser(u)
    } catch { router.replace('/') }
  }, [])

  if (!mounted || !user) return null

  return (
    <>
      <Head>
        <title>ANAGO ARENA — Choose Mode</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">

        {/* Logo */}
        <div className="text-center mb-10">
          <div style={{
            width: 88, height: 88,
            borderRadius: '50%',
            background: '#5B3FDB',
            border: '4px solid #2D2D2D',
            boxShadow: '5px 5px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <DogIcon size={56} color="#C17A2A" />
          </div>
          <h1 className="font-arcade" style={{
            fontSize: 'clamp(16px, 5vw, 28px)',
            color: '#F5EFE0',
            textShadow: '4px 4px 0 #2D2D2D, -2px -2px 0 #2D2D2D',
            letterSpacing: 2,
          }}>
            ANAGO ARENA
          </h1>
          <p className="font-arcade mt-2" style={{ fontSize: 8, color: '#C17A2A', letterSpacing: 2 }}>
            <PawIcon size={10} color="#C17A2A" style={{ display: 'inline', marginRight: 4 }} />
            {user.username} · {shortenAddress(user.wallet)}
          </p>
        </div>

        {/* Mode cards */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: '100%',
          maxWidth: 380,
        }}>

          {/* REGULAR GAMES */}
          <ModeCard
            emoji="🎮"
            title="REGULAR GAMES"
            desc="BasketBattle & Head Ball. VS AI or PVP."
            color="#C17A2A"
            shadow="#8A4A0A"
            bg="rgba(193,122,42,0.18)"
            hovered={hover === 'games'}
            onHover={() => setHover('games')}
            onLeave={() => setHover(null)}
            onClick={() => router.push('/arena')}
            badge="2 GAMES"
            badgeColor="#F0B429"
          />

          {/* CASINO */}
          <ModeCard
            emoji="🎰"
            title="CASINO"
            desc="Coming soon — dog-themed casino games."
            color="#5B3FDB"
            shadow="#3A2490"
            bg="rgba(91,63,219,0.18)"
            hovered={hover === 'casino'}
            onHover={() => setHover('casino')}
            onLeave={() => setHover(null)}
            onClick={() => router.push('/casino')}
            badge="COMING SOON"
            badgeColor="#5B3FDB"
            locked
          />
        </div>

        <button
          onClick={() => { disconnect(); localStorage.removeItem('bb_user'); router.push('/') }}
          className="font-arcade mt-10"
          style={{ fontSize: 7, color: 'rgba(244,160,160,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Disconnect Wallet
        </button>
      </div>
    </>
  )
}

function ModeCard({ emoji, title, desc, color, shadow, bg, hovered, onHover, onLeave, onClick, badge, badgeColor, locked }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        background: hovered && !locked ? bg : 'rgba(42,30,110,0.75)',
        border: `4px solid ${hovered && !locked ? color : '#2D2D2D'}`,
        borderRadius: 18,
        boxShadow: hovered && !locked ? `5px 5px 0 ${shadow}` : '4px 4px 0 #2D2D2D',
        padding: '22px 20px',
        cursor: locked ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.12s',
        transform: hovered && !locked ? 'translateY(-3px)' : 'none',
        opacity: locked ? 0.75 : 1,
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: badgeColor,
        color: '#1A1008',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 6,
        padding: '3px 8px',
        borderRadius: 6,
        border: '2px solid #2D2D2D',
        boxShadow: '2px 2px 0 #2D2D2D',
      }}>
        {badge}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Emoji in circle */}
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: color,
          border: '3px solid #2D2D2D',
          boxShadow: '3px 3px 0 #2D2D2D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, flexShrink: 0,
        }}>
          {emoji}
        </div>

        <div style={{ flex: 1 }}>
          <p className="font-arcade" style={{
            fontSize: 13,
            color: '#F5EFE0',
            textShadow: '2px 2px 0 #2D2D2D',
            marginBottom: 6,
          }}>
            {title}
          </p>
          <p style={{
            fontFamily: 'sans-serif',
            fontSize: 12,
            color: 'rgba(245,239,224,0.65)',
            lineHeight: 1.5,
          }}>
            {desc}
          </p>
        </div>
      </div>

      {/* Arrow */}
      {!locked && (
        <div style={{
          marginTop: 14,
          background: color,
          border: '2px solid #2D2D2D',
          boxShadow: `2px 2px 0 ${shadow}`,
          borderRadius: 8,
          padding: '7px 0',
          textAlign: 'center',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          color: '#F5EFE0',
        }}>
          ENTER →
        </div>
      )}

      {locked && (
        <div style={{
          marginTop: 14,
          background: 'rgba(91,63,219,0.3)',
          border: '2px solid #2D2D2D',
          borderRadius: 8,
          padding: '7px 0',
          textAlign: 'center',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          color: 'rgba(245,239,224,0.4)',
        }}>
          🔒 LOCKED
        </div>
      )}
    </button>
  )
}
