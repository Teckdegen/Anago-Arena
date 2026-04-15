import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  TrophyIcon, PawIcon,
  MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon,
  ArrowLeftIcon, CopyIcon, StarIcon,
} from '../components/Icons'

const GAMES = [
  { id: 'all',        label: 'ALL GAMES',  emoji: '🏆' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'football',   label: 'Football',   emoji: '⚽' },
]

function RankBadge({ index }) {
  if (index === 0) return <MedalGoldIcon size={24} />
  if (index === 1) return <MedalSilverIcon size={24} />
  if (index === 2) return <MedalBronzeIcon size={24} />
  return (
    <span style={{
      fontFamily: "'Press Start 2P', monospace", fontSize: 9,
      color: '#F5EFE0', background: 'rgba(91,63,219,0.4)',
      border: '2px solid #2D2D2D', borderRadius: 6,
      padding: '2px 6px', display: 'inline-block', minWidth: 26, textAlign: 'center',
    }}>{index + 1}</span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', opacity: copied ? 1 : 0.6 }}>
      {copied ? <span style={{ fontSize: 9, color: '#27AE60' }}>✓</span> : <CopyIcon size={13} color="#C17A2A" />}
    </button>
  )
}

export default function Leaderboard() {
  const router = useRouter()
  const [activeGame, setActiveGame] = useState('all')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWallet, setCurrentWallet] = useState('')
  const [total, setTotal] = useState(0)
  const [gameLabel, setGameLabel] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) setCurrentWallet((JSON.parse(saved).wallet || '').toLowerCase())
    // Check URL param
    const g = router.query.game
    if (g && GAMES.find(x => x.id === g)) setActiveGame(g)
  }, [router.query])

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [activeGame])

  async function fetchLeaderboard() {
    setLoading(true)
    try {
      const url = activeGame === 'all'
        ? '/api/leaderboard'
        : `/api/leaderboard?game=${activeGame}`
      const res  = await fetch(url)
      const json = await res.json()
      setPlayers(json.leaderboard || [])
      setTotal(json.total || 0)
      setGameLabel(json.game_label || '')
    } catch {}
    setLoading(false)
  }

  const scoreKey = activeGame === 'all' ? 'total_points' : 'best_score'

  return (
    <>
      <Head>
        <title>Leaderboard – ANAGO ARENA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div className="min-h-screen px-3 py-6">

        {/* Header */}
        <div style={{ maxWidth: 820, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/arena')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeftIcon size={28} color="#C17A2A" />
          </button>
          <div className="text-center">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <TrophyIcon size={26} color="#F0B429" />
              <h1 className="font-arcade" style={{ fontSize: 'clamp(11px,3vw,18px)', color: '#F0B429', textShadow: '3px 3px 0 #2D2D2D' }}>
                ANAGO ARENA
              </h1>
              <TrophyIcon size={26} color="#F0B429" />
            </div>
            <p className="font-arcade mt-1" style={{ fontSize: 7, color: '#C17A2A' }}>
              {total > 0 ? `${total} DOGS` : 'LEADERBOARD'}
            </p>
          </div>
          <div style={{ width: 28 }} />
        </div>

        {/* Game tabs */}
        <div style={{
          maxWidth: 820, margin: '0 auto 16px',
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGame(g.id)}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 7,
                padding: '6px 10px',
                borderRadius: 8,
                border: '3px solid #2D2D2D',
                boxShadow: activeGame === g.id ? '3px 3px 0 #2D2D2D' : '2px 2px 0 #2D2D2D',
                background: activeGame === g.id ? '#C17A2A' : 'rgba(42,30,110,0.7)',
                color: activeGame === g.id ? '#F5EFE0' : 'rgba(245,239,224,0.6)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transform: activeGame === g.id ? 'translateY(-1px)' : 'none',
                transition: 'all 0.1s',
              }}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p className="font-arcade" style={{ fontSize: 9, color: '#C17A2A' }}>Loading...</p>
            </div>
          )}

          {!loading && players.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p className="font-arcade" style={{ fontSize: 9, color: 'rgba(245,239,224,0.4)', lineHeight: 2.2 }}>
                No players yet.<br />Be the first!
              </p>
            </div>
          )}

          {!loading && players.length > 0 && (
            <div style={{
              background: 'rgba(30,21,64,0.9)',
              border: '4px solid #2D2D2D',
              borderRadius: 16,
              boxShadow: '4px 4px 0 #2D2D2D',
              overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 1fr auto auto',
                background: '#2D2D2D',
                padding: '10px 12px',
              }}>
                {['#', 'DOG', 'WALLET', 'PTS', 'W/L'].map(h => (
                  <span key={h} className="font-arcade" style={{ fontSize: 7, color: '#F0B429', padding: '0 4px' }}>{h}</span>
                ))}
              </div>

              {players.map((p, i) => {
                const isMe = (p.wallet_address || '').toLowerCase() === currentWallet
                return (
                  <div key={p.wallet_address} style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 1fr auto auto',
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(91,63,219,0.2)',
                    background: isMe ? 'rgba(193,122,42,0.18)' : i % 2 === 0 ? 'rgba(42,30,110,0.4)' : 'rgba(30,21,64,0.4)',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RankBadge index={i} />
                    </div>
                    <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <PawIcon size={11} color={isMe ? '#F0B429' : '#C17A2A'} />
                      <span className="font-arcade" style={{ fontSize: 9, color: isMe ? '#F0B429' : '#F5EFE0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.username}{isMe && <span style={{ color: '#F4A0A0' }}> ←</span>}
                      </span>
                    </div>
                    <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(244,160,160,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {p.wallet_address}
                      </span>
                      <CopyButton text={p.wallet_address} />
                    </div>
                    <div style={{ padding: '0 8px', textAlign: 'right' }}>
                      <span className="font-arcade" style={{ fontSize: 9, color: '#F0B429' }}>
                        {(p[scoreKey] || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ padding: '0 8px', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(245,239,224,0.6)' }}>
                        {p.games_won || 0}W/{(p.games_played || 0) - (p.games_won || 0)}L
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="font-arcade text-center mt-4" style={{ fontSize: 7, color: 'rgba(193,122,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <PawIcon size={9} color="rgba(193,122,42,0.4)" /> Auto-refreshes every 30s
          </p>
        </div>
      </div>
    </>
  )
}
