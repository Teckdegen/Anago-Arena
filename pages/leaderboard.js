import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  TrophyIcon, PawIcon,
  MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon,
  ArrowLeftIcon, CopyIcon, StarIcon,
} from '../components/Icons'

function RankBadge({ index }) {
  if (index === 0) return <MedalGoldIcon size={26} />
  if (index === 1) return <MedalSilverIcon size={26} />
  if (index === 2) return <MedalBronzeIcon size={26} />
  return (
    <span style={{
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 10,
      color: '#F5EFE0',
      background: 'rgba(91,63,219,0.4)',
      border: '2px solid rgba(91,63,219,0.6)',
      borderRadius: 6,
      padding: '3px 6px',
      display: 'inline-block',
      minWidth: 28,
      textAlign: 'center',
    }}>
      {index + 1}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy wallet address"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 4px', display: 'inline-flex', alignItems: 'center',
        opacity: copied ? 1 : 0.6,
        transition: 'opacity 0.15s',
      }}
    >
      {copied
        ? <span style={{ fontSize: 9, color: '#27AE60', fontFamily: 'monospace' }}>✓</span>
        : <CopyIcon size={14} color="#C17A2A" />
      }
    </button>
  )
}

export default function Leaderboard() {
  const router = useRouter()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWallet, setCurrentWallet] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) setCurrentWallet((JSON.parse(saved).wallet || '').toLowerCase())
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchLeaderboard() {
    try {
      // Fetch ALL users — no limit cap for admin visibility
      const res = await fetch('/api/leaderboard?limit=1000')
      const json = await res.json()
      setPlayers(json.leaderboard || [])
      setTotal(json.total || (json.leaderboard || []).length)
    } catch {}
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>BasketBattle – Leaderboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div className="min-h-screen px-3 py-6">

        {/* ── Header ── */}
        <div style={{ maxWidth: 780, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/menu')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeftIcon size={28} color="#C17A2A" />
          </button>

          <div className="text-center">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <TrophyIcon size={28} color="#F0B429" />
              <h1 className="font-arcade" style={{
                fontSize: 'clamp(11px, 3vw, 18px)',
                color: '#F0B429',
                textShadow: '3px 3px 0 #2D2D2D',
              }}>
                Leaderboard
              </h1>
              <TrophyIcon size={28} color="#F0B429" />
            </div>
            <p className="font-arcade mt-1" style={{
              fontSize: 7, color: '#C17A2A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <PawIcon size={10} color="#C17A2A" />
              {total > 0 ? `${total} DOGS REGISTERED` : 'TOP DOGS'}
            </p>
          </div>

          <div style={{ width: 28 }} />
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <PawIcon size={32} color="#C17A2A" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
              <p className="font-arcade mt-4" style={{ fontSize: 9, color: '#C17A2A' }}>Loading...</p>
            </div>
          )}

          {!loading && players.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <BasketballIconInline />
              <p className="font-arcade mt-4" style={{ fontSize: 9, color: 'rgba(245,239,224,0.5)', lineHeight: 2.2 }}>
                No players yet.<br />Be the first to play!
              </p>
            </div>
          )}

          {!loading && players.length > 0 && (
            <>
              {/* Top 3 podium */}
              {players.length >= 3 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  gap: 8, marginBottom: 24,
                }}>
                  {/* 2nd */}
                  <PodiumCard player={players[1]} rank={2} height={90} isCurrent={players[1].wallet_address.toLowerCase() === currentWallet} />
                  {/* 1st */}
                  <PodiumCard player={players[0]} rank={1} height={120} isCurrent={players[0].wallet_address.toLowerCase() === currentWallet} />
                  {/* 3rd */}
                  <PodiumCard player={players[2]} rank={3} height={70} isCurrent={players[2].wallet_address.toLowerCase() === currentWallet} />
                </div>
              )}

              {/* Full table */}
              <div style={{
                background: 'rgba(30, 21, 64, 0.9)',
                border: '4px solid #2D2D2D',
                borderRadius: 16,
                boxShadow: '4px 4px 0 #2D2D2D',
                overflow: 'hidden',
              }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 1fr auto auto auto',
                  gap: 0,
                  background: '#2D2D2D',
                  padding: '10px 12px',
                }}>
                  {['#', 'DOG', 'WALLET', 'PTS', 'LVL', 'W/L'].map(h => (
                    <span key={h} className="font-arcade" style={{
                      fontSize: 7, color: '#F0B429', letterSpacing: 1,
                      padding: '0 4px',
                    }}>{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {players.map((p, i) => {
                  const isMe = p.wallet_address.toLowerCase() === currentWallet
                  return (
                    <div
                      key={p.wallet_address}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '44px 1fr 1fr auto auto auto',
                        gap: 0,
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(91,63,219,0.2)',
                        background: isMe
                          ? 'rgba(193,122,42,0.18)'
                          : i % 2 === 0 ? 'rgba(42,30,110,0.4)' : 'rgba(30,21,64,0.4)',
                        alignItems: 'center',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Rank */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RankBadge index={i} />
                      </div>

                      {/* Username */}
                      <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <PawIcon size={12} color={isMe ? '#F0B429' : '#C17A2A'} />
                        <span className="font-arcade" style={{
                          fontSize: 9,
                          color: isMe ? '#F0B429' : '#F5EFE0',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.username}
                          {isMe && <span style={{ color: '#F4A0A0', marginLeft: 4 }}>←YOU</span>}
                        </span>
                      </div>

                      {/* Full wallet address */}
                      <div style={{
                        padding: '0 6px',
                        display: 'flex', alignItems: 'center', gap: 2,
                        minWidth: 0,
                      }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 9,
                          color: isMe ? '#F4A0A0' : 'rgba(244,160,160,0.75)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1,
                        }}>
                          {p.wallet_address}
                        </span>
                        <CopyButton text={p.wallet_address} />
                      </div>

                      {/* Points */}
                      <div style={{ padding: '0 8px', textAlign: 'right' }}>
                        <span className="font-arcade" style={{ fontSize: 9, color: '#F0B429' }}>
                          {p.total_points.toLocaleString()}
                        </span>
                      </div>

                      {/* Level */}
                      <div style={{ padding: '0 8px', textAlign: 'right' }}>
                        <span className="font-arcade" style={{ fontSize: 9, color: '#C17A2A' }}>
                          {p.highest_level}
                        </span>
                      </div>

                      {/* W/L */}
                      <div style={{ padding: '0 8px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(245,239,224,0.65)' }}>
                          {p.games_won}W/{(p.games_played - p.games_won)}L
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="font-arcade text-center mt-4" style={{
                fontSize: 7, color: 'rgba(193,122,42,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <PawIcon size={9} color="rgba(193,122,42,0.5)" /> Auto-refreshes every 30s
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Podium card ────────────────────────────────────────────────────────────
function PodiumCard({ player, rank, height, isCurrent }) {
  const colors = { 1: '#F0B429', 2: '#C0C0C0', 3: '#CD7F32' }
  const c = colors[rank]
  return (
    <div style={{
      flex: 1, maxWidth: 180,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {rank === 1 && (
        <StarIcon size={20} color="#F0B429" fill="#F0B429" style={{ marginBottom: 4 }} />
      )}
      <div style={{
        background: isCurrent ? 'rgba(193,122,42,0.25)' : 'rgba(42,30,110,0.8)',
        border: `3px solid ${c}`,
        borderRadius: 12,
        boxShadow: `3px 3px 0 #2D2D2D`,
        padding: '10px 8px',
        textAlign: 'center',
        width: '100%',
        marginBottom: 4,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          {rank === 1 && <MedalGoldIcon size={22} />}
          {rank === 2 && <MedalSilverIcon size={22} />}
          {rank === 3 && <MedalBronzeIcon size={22} />}
        </div>
        <p className="font-arcade" style={{ fontSize: 8, color: '#F5EFE0', marginBottom: 2 }}>
          {player.username}
        </p>
        <p className="font-arcade" style={{ fontSize: 10, color: c }}>
          {player.total_points.toLocaleString()}
        </p>
        <p style={{
          fontFamily: 'monospace', fontSize: 8,
          color: 'rgba(244,160,160,0.7)',
          marginTop: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}>
          {player.wallet_address.slice(0, 8)}…
        </p>
      </div>
      {/* Podium block */}
      <div style={{
        width: '100%', height,
        background: c,
        border: '3px solid #2D2D2D',
        borderRadius: '6px 6px 0 0',
        boxShadow: '3px 3px 0 #2D2D2D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="font-arcade" style={{ fontSize: 18, color: '#2D2D2D' }}>{rank}</span>
      </div>
    </div>
  )
}

// Inline basketball for empty state
function BasketballIconInline() {
  return (
    <svg width={48} height={48} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block' }}>
      <circle cx="16" cy="16" r="14" fill="#C17A2A" stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M6 8 C9 11 10 13.5 10 16 S9 21 6 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M26 8 C23 11 22 13.5 22 16 S23 21 26 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="30" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
