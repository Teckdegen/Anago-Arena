import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../../components/GameLobby'
import { upsertGameScore } from '../../lib/supabase'
import { TrophyIcon, SkullIcon, ArrowLeftIcon } from '../../components/Icons'

const FootballCanvas = dynamic(() => import('../../components/games/FootballCanvas'), { ssr: false })

const FORMATIONS = ['1-2-1', '1-1-2', '1-3-0']
const FORMATION_DESC = {
  '1-2-1': 'Balanced. GK + 2 defenders + 1 mid + 1 forward.',
  '1-1-2': 'Attacking. GK + 1 defender + 1 mid + 2 forwards.',
  '1-3-0': 'Defensive. GK + 3 defenders + 1 mid, no forwards.',
}

export default function FootballPage() {
  const router = useRouter()
  const [gameState, setGameState]   = useState('lobby')   // lobby | formation | playing | result
  const [gameConfig, setGameConfig] = useState(null)
  const [formation, setFormation]   = useState('1-2-1')
  const [result, setResult]         = useState(null)
  const [scores, setScores]         = useState([0, 0])
  const [user, setUser]             = useState(null)
  const [pendingConfig, setPending] = useState(null)      // config waiting for formation pick

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) setUser(JSON.parse(saved))

    window.ANAGO_UI = {
      updateScore: (s0, s1) => setScores([s0, s1]),
      showResult: async (winner, finalScores) => {
        setResult({ winner, scores: finalScores })
        setGameState('result')
        const s = localStorage.getItem('bb_user')
        if (s) {
          const u = JSON.parse(s)
          await upsertGameScore(u.wallet, 'football', {
            score: finalScores[0],
            won: winner === 0,
          })
          if (winner === 0) {
            const old = parseInt(localStorage.getItem('bb_points') || '0')
            localStorage.setItem('bb_points', String(old + finalScores[0] * 10))
          }
        }
      },
    }
    return () => { delete window.ANAGO_UI }
  }, [])

  function startWithFormation() {
    setGameConfig({ ...pendingConfig, formation })
    setGameState('playing')
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (gameState === 'lobby') return (
    <>
      <Head><title>Dog Football – ANAGO ARENA</title></Head>
      <GameLobby
        gameId="football"
        gameName="Dog Football"
        gameEmoji="⚽"
        accentColor="#27AE60"
        onStartAI={({ level }) => {
          setPending({ mode: 'ai', level })
          setGameState('formation')
        }}
        onStartPVP={({ roomId, side, opponent }) => {
          // Real PVP — roomId comes from Supabase room
          setPending({ mode: 'pvp', roomId, side, opponent })
          setGameState('formation')
        }}
      />
    </>
  )

  // ── FORMATION PICKER ───────────────────────────────────────────────────────
  if (gameState === 'formation') return (
    <>
      <Head><title>Pick Formation – Dog Football</title></Head>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <button
          onClick={() => setGameState('lobby')}
          style={{ position: 'fixed', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeftIcon size={28} color="#27AE60" />
        </button>

        <div className="text-center mb-8">
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚽</div>
          <h1 className="font-arcade" style={{ fontSize: 'clamp(12px,3vw,18px)', color: '#F5EFE0', textShadow: '3px 3px 0 #2D2D2D' }}>
            PICK FORMATION
          </h1>
          <p className="font-arcade mt-2" style={{ fontSize: 7, color: '#27AE60' }}>
            {pendingConfig?.mode === 'pvp' ? 'PVP MATCH' : 'VS AI'}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 380 }}>
          {FORMATIONS.map(f => (
            <button
              key={f}
              onClick={() => setFormation(f)}
              style={{
                background: formation === f ? 'rgba(39,174,96,0.25)' : 'rgba(42,30,110,0.7)',
                border: `4px solid ${formation === f ? '#27AE60' : '#2D2D2D'}`,
                borderRadius: 14,
                boxShadow: formation === f ? '4px 4px 0 #1A6B3A' : '3px 3px 0 #2D2D2D',
                padding: '14px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-arcade" style={{ fontSize: 14, color: formation === f ? '#27AE60' : '#F5EFE0' }}>
                  {f}
                </span>
                {formation === f && (
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                    background: '#27AE60', color: '#1A1008',
                    padding: '3px 8px', borderRadius: 4, border: '2px solid #2D2D2D',
                  }}>SELECTED</span>
                )}
              </div>
              <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: 'rgba(245,239,224,0.6)', marginTop: 4 }}>
                {FORMATION_DESC[f]}
              </p>
            </button>
          ))}
        </div>

        <button
          className="btn-arcade w-full mt-6"
          style={{ maxWidth: 380, fontSize: 12, padding: '16px 0', background: '#27AE60' }}
          onClick={startWithFormation}
        >
          KICK OFF →
        </button>
      </div>
    </>
  )

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (gameState === 'playing') return (
    <>
      <Head><title>Dog Football – ANAGO ARENA</title></Head>

      {/* Controls hint */}
      <div className="fixed top-16 left-1/2 z-10 pointer-events-none" style={{ transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
        <span className="font-arcade" style={{ fontSize: 6, color: 'rgba(255,255,255,0.4)' }}>
          TAP=MOVE · TAP TEAMMATE=PASS · DOUBLE TAP NEAR BALL=SHOOT
        </span>
      </div>

      {/* Quit */}
      <div className="fixed bottom-4 left-1/2 z-20 pointer-events-auto" style={{ transform: 'translateX(-50%)' }}>
        <button
          className="btn-arcade purple"
          style={{ fontSize: 8, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => { setGameState('lobby'); setScores([0, 0]) }}
        >
          <ArrowLeftIcon size={14} color="#F5EFE0" /> QUIT
        </button>
      </div>

      <FootballCanvas config={gameConfig} />
    </>
  )

  // ── RESULT ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(15,8,40,0.92)' }}>
      <div className="cartoon-card text-center" style={{
        maxWidth: 340, padding: '32px 24px',
        borderColor: result.winner === 0 ? '#27AE60' : '#E05050',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {result.winner === 0 ? <TrophyIcon size={56} color="#F0B429" /> : <SkullIcon size={56} color="#E05050" />}
        </div>
        <h2 className="font-arcade" style={{
          fontSize: 20,
          color: result.winner === 0 ? '#F0B429' : '#E05050',
          textShadow: '3px 3px 0 #2D2D2D',
        }}>
          {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>
        <p className="font-arcade mt-4" style={{ fontSize: 18, color: '#F5EFE0' }}>
          {result.scores[0]} – {result.scores[1]}
        </p>
        <p className="font-arcade mt-2" style={{ fontSize: 7, color: '#27AE60' }}>
          Formation: {gameConfig?.formation}
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button
            className="btn-arcade w-full"
            style={{ fontSize: 10, background: '#27AE60' }}
            onClick={() => { setGameState('formation'); setScores([0, 0]); setResult(null) }}
          >
            PLAY AGAIN
          </button>
          <button className="btn-arcade purple w-full" style={{ fontSize: 10 }}
            onClick={() => setGameState('lobby')}>
            LOBBY
          </button>
          <button className="btn-arcade gold w-full" style={{ fontSize: 10 }}
            onClick={() => router.push('/arena')}>
            ← ALL GAMES
          </button>
        </div>
      </div>
    </div>
  )
}
