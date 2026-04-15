import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import HowToPlay from '../components/HowToPlay'
import { updateUserStats } from '../lib/supabase'
import { PawIcon, TrophyIcon, SkullIcon, MenuIcon } from '../components/Icons'

const GameCanvas = dynamic(() => import('../components/GameCanvas'), { ssr: false })

export default function GamePage() {
  const router = useRouter()
  const { mode, room } = router.query

  const [user, setUser] = useState(null)
  const [level, setLevel] = useState(1)
  const [scores, setScores] = useState([0, 0])
  const [stunned, setStunned] = useState(null)
  const [result, setResult] = useState(null)
  const [scorePopups, setScorePopups] = useState([])
  const [showHowTo, setShowHowTo] = useState(false)
  const [gameReady, setGameReady] = useState(false)

  const stunTimeoutRef = useRef(null)
  const popupIdRef = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.push('/'); return }
    const u = JSON.parse(saved)
    setUser(u)
    const lvl = parseInt(localStorage.getItem('bb_level') || '1')
    setLevel(lvl)

    const seen = localStorage.getItem('bb_seen_howto')
    if (!seen) {
      setShowHowTo(true)
    } else {
      setGameReady(true)
    }
  }, [])

  function handleHowToClose() {
    localStorage.setItem('bb_seen_howto', '1')
    setShowHowTo(false)
    setGameReady(true)
  }

  useEffect(() => {
    window.BB_GAME_UI = {
      showScore: (idx, pts, s0, s1) => {
        setScores([s0, s1])
        const id = ++popupIdRef.current
        const x = 30 + Math.random() * (window.innerWidth - 120)
        const y = 80 + Math.random() * (window.innerHeight * 0.35)
        setScorePopups(prev => [...prev, { id, pts, x, y }])
        setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== id)), 1500)
      },
      showStun: (side) => {
        setStunned(side)
        clearTimeout(stunTimeoutRef.current)
        stunTimeoutRef.current = setTimeout(() => setStunned(null), 750)
      },
      updateScore: (s0, s1) => setScores([s0, s1]),
      showResult: async (winnerIdx, finalScores) => {
        setResult({ winner: winnerIdx, scores: finalScores })
        const saved = localStorage.getItem('bb_user')
        if (saved) {
          const u = JSON.parse(saved)
          const lvl = parseInt(localStorage.getItem('bb_level') || '1')
          // Only award points to the player if they won (winnerIdx === 0 = player)
          const playerPoints = winnerIdx === 0 ? finalScores[0] : 0
          await updateUserStats(u.wallet, {
            pointsEarned: playerPoints,
            level: lvl,
            won: winnerIdx === 0,
          })
          if (winnerIdx === 0) {
            const oldPts = parseInt(localStorage.getItem('bb_points') || '0')
            localStorage.setItem('bb_points', String(oldPts + finalScores[0]))
          }
        }
      },
    }
    return () => { delete window.BB_GAME_UI }
  }, [])

  function handleNextLevel() {
    const newLevel = level + 1
    localStorage.setItem('bb_level', String(newLevel))
    router.reload()
  }

  if (!user) return null

  const p2Name = mode === 'pvp'
    ? (localStorage.getItem('bb_pvp_opponent') || 'Player 2')
    : 'AI Dog'

  return (
    <>
      <Head>
        <title>BasketBattle – Game</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#2A1B5E" />
      </Head>

      {gameReady && (
        <GameCanvas mode={mode || 'ai'} level={level} user={user} room={room} />
      )}

      {/* HUD */}
      {gameReady && !result && (
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="flex justify-between items-start p-3 gap-2">
            {/* P1 — amber accent */}
            <div className="hud-panel">
              <p className="hud-score" style={{ color: '#C17A2A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <PawIcon size={12} color="#C17A2A" /> {user.username}
              </p>
              <p className="hud-score mt-1" style={{ color: '#F5EFE0' }}>{scores[0]} pts</p>
            </div>
            {/* Level — purple badge */}
            <div className="hud-panel text-center" style={{ borderColor: 'rgba(91,63,219,0.6)' }}>
              <p className="hud-score" style={{ color: '#F4A0A0' }}>LVL {level}</p>
              <p className="hud-score mt-1" style={{ color: 'rgba(245,239,224,0.5)', fontSize: 8 }}>to 100</p>
            </div>
            {/* P2 — pink accent */}
            <div className="hud-panel" style={{ textAlign: 'right', borderColor: 'rgba(244,160,160,0.5)' }}>
              <p className="hud-score" style={{ color: '#F4A0A0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                {p2Name} <PawIcon size={12} color="#F4A0A0" />
              </p>
              <p className="hud-score mt-1" style={{ color: '#F5EFE0' }}>{scores[1]} pts</p>
            </div>
          </div>

          {/* Menu button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => router.push('/menu')}
              className="font-arcade"
              style={{
                fontSize: 8,
                color: 'rgba(244,160,160,0.7)',
                background: 'rgba(30,21,64,0.7)',
                border: '2px solid rgba(91,63,219,0.4)',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MenuIcon size={12} color="currentColor" /> MENU
            </button>
          </div>
        </div>
      )}

      {/* Stun overlay */}
      {stunned && <div className="stun-overlay" />}

      {/* Score popups */}
      {scorePopups.map(p => (
        <div key={p.id} className="score-popup" style={{ left: p.x, top: p.y }}>
          +{p.pts}
        </div>
      ))}

      {/* Result screen */}
      {result && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,8,40,0.9)' }}
        >
          <div
            className="result-screen cartoon-card w-full text-center"
            style={{
              maxWidth: 360,
              padding: '32px 24px',
              borderColor: result.winner === 0 ? '#C17A2A' : '#E05050',
              boxShadow: `4px 4px 0 #2D2D2D, 0 0 60px ${result.winner === 0 ? 'rgba(193,122,42,0.4)' : 'rgba(224,80,80,0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              {result.winner === 0
                ? <TrophyIcon size={60} color="#F0B429" />
                : <SkullIcon size={60} color="#E05050" />
              }
            </div>

            <h2
              className="font-arcade"
              style={{
                fontSize: 'clamp(14px,4vw,22px)',
                color: result.winner === 0 ? '#F0B429' : '#E05050',
                textShadow: '3px 3px 0 #2D2D2D',
              }}
            >
              {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
            </h2>

            <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: 'rgba(193,122,42,0.18)',
                border: '2px solid rgba(193,122,42,0.4)',
                borderRadius: 10, padding: '10px 16px',
              }}>
                <p className="font-arcade" style={{ fontSize: 10, color: '#C17A2A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PawIcon size={12} color="#C17A2A" /> {user.username}: {result.scores[0]} pts
                </p>
              </div>
              <div style={{
                background: 'rgba(244,160,160,0.12)',
                border: '2px solid rgba(244,160,160,0.3)',
                borderRadius: 10, padding: '10px 16px',
              }}>
                <p className="font-arcade" style={{ fontSize: 10, color: '#F4A0A0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PawIcon size={12} color="#F4A0A0" /> {p2Name}: {result.scores[1]} pts
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {result.winner === 0 && (
                <button
                  className="btn-arcade gold w-full"
                  style={{ fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={handleNextLevel}
                >
                  <PawIcon size={14} color="currentColor" /> NEXT LEVEL
                </button>
              )}
              <button
                className="btn-arcade purple w-full"
                style={{ fontSize: 10 }}
                onClick={() => router.push('/menu')}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {showHowTo && <HowToPlay onClose={handleHowToClose} />}
    </>
  )
}
