import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { TrophyIcon, PawIcon, MedalGoldIcon, MedalSilverIcon, MedalBronzeIcon, ArrowLeftIcon } from '../components/Icons'

function shortenAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function RankCell({ index }) {
  if (index === 0) return <MedalGoldIcon size={18} />
  if (index === 1) return <MedalSilverIcon size={18} />
  if (index === 2) return <MedalBronzeIcon size={18} />
  return <span>{index + 1}</span>
}

export default function Leaderboard() {
  const router = useRouter()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWallet, setCurrentWallet] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) setCurrentWallet((JSON.parse(saved).wallet || '').toLowerCase())
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard?limit=50')
      const json = await res.json()
      setPlayers(json.leaderboard || [])
    } catch {}
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>BasketBattle – Leaderboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#2A1B5E" />
      </Head>

      <div className="min-h-screen px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ maxWidth: 680, margin: '0 auto 24px' }}>
          <button
            onClick={() => router.push('/menu')}
            className="font-arcade"
            style={{ fontSize: 8, color: 'rgba(193,122,42,0.7)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ArrowLeftIcon size={12} color="currentColor" /> Back
          </button>
          <div className="text-center">
            <h1 className="font-arcade" style={{
              fontSize: 'clamp(12px,3vw,18px)',
              color: '#F0B429',
              textShadow: '2px 2px 0 #2D2D2D',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <TrophyIcon size={20} color="#F0B429" /> Leaderboard
            </h1>
            <p className="font-arcade mt-1" style={{
              fontSize: 7, color: '#C17A2A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <PawIcon size={10} color="#C17A2A" /> TOP DOGS
            </p>
          </div>
          <div style={{ width: 50 }} />
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {loading && (
            <p className="font-arcade text-center py-12" style={{ fontSize: 9, color: '#8B6FDB' }}>
              Loading...
            </p>
          )}

          {!loading && players.length === 0 && (
            <p className="font-arcade text-center py-12" style={{ fontSize: 9, color: '#8B6FDB', lineHeight: 2 }}>
              No players yet.<br/>Be the first to play!
            </p>
          )}

          {!loading && players.length > 0 && (
            <div className="cartoon-card" style={{ overflow: 'hidden' }}>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dog</th>
                    <th>Wallet</th>
                    <th>Points</th>
                    <th>Lvl</th>
                    <th>W/L</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr
                      key={p.wallet_address}
                      className={p.wallet_address.toLowerCase() === currentWallet ? 'current-user' : ''}
                    >
                      <td style={{ textAlign: 'center' }}><RankCell index={i} /></td>
                      <td className="font-arcade" style={{ color: '#F5EFE0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <PawIcon size={11} color="#C17A2A" /> {p.username}
                        </span>
                      </td>
                      <td className="font-mono" style={{ color: '#F4A0A0', opacity: 0.85 }}>
                        {shortenAddress(p.wallet_address)}
                      </td>
                      <td className="font-arcade" style={{ color: '#F0B429' }}>
                        {p.total_points.toLocaleString()}
                      </td>
                      <td className="font-arcade" style={{ color: '#C17A2A' }}>{p.highest_level}</td>
                      <td style={{ color: 'rgba(245,239,224,0.7)', fontFamily: 'monospace', fontSize: 10 }}>
                        {p.games_won}W/{p.games_played - p.games_won}L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="font-arcade text-center mt-6" style={{ fontSize: 7, color: 'rgba(139,111,219,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            Auto-refreshes every 30s <PawIcon size={9} color="rgba(139,111,219,0.4)" />
          </p>
        </div>
      </div>
    </>
  )
}
