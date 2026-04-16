import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../components/GameLobby'
import { updateUserStats, supabase } from '../lib/supabase'
import { PawIcon, TrophyIcon, SkullIcon, ArrowLeftIcon } from '../components/Icons'

const GameCanvas = dynamic(() => import('../components/GameCanvas'), { ssr: false })

export default function BasketballPage() {
  const router = useRouter()

  const [gameState, setGameState] = useState('lobby')
  const [gameConfig, setGameConfig] = useState(null)
  const [user, setUser]       = useState(null)
  const [level, setLevel]     = useState(1)
  const [scores, setScores]   = useState([0, 0])
  const [result, setResult]   = useState(null)
  const [scorePopups, setScorePopups] = useState([])
  const [stunned, setStunned] = useState(null)

  const stunRef      = useRef(null)
  const popupRef     = useRef(0)
  const waitSubRef   = useRef(null)   // realtime subscription while waiting
  const waitConfigRef = useRef(null)  // gameConfig snapshot for the waiting room

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.push('/'); return }
    const u = JSON.parse(saved)
    setUser(u)
    setLevel(parseInt(localStorage.getItem('bb_level') || '1'))
  }, [])

  // Cleanup waiting subscription on unmount
  useEffect(() => {
    return () => {
      waitSubRef.current?.unsubscribe?.()
    }
  }, [])

  // BB_GAME_UI bridge — used by the Three.js game engine
  useEffect(() => {
    window.BB_GAME_UI = {
      showScore: (idx, pts, s0, s1) => {
        setScores([s0, s1])
        const id = ++popupRef.current
        const x  = 30 + Math.random() * (window.innerWidth - 120)
        const y  = 80 + Math.random() * (window.innerHeight * 0.35)
        setScorePopups(prev => [...prev, { id, pts, x, y }])
        setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== id)), 1500)
      },
      showStun: (side) => {
        setStunned(side)
        clearTimeout(stunRef.current)
        stunRef.current = setTimeout(() => setStunned(null), 750)
      },
      updateScore: (s0, s1) => setScores([s0, s1]),
      showResult: async (winnerIdx, finalScores) => {
        setResult({ winner: winnerIdx, scores: finalScores })
        setGameState('result')
        const s = localStorage.getItem('bb_user')
        if (s) {
          const u = JSON.parse(s)
          const lvl = parseInt(localStorage.getItem('bb_level') || '1')
          const playerPoints = winnerIdx === 0 ? finalScores[0] : 0
          await updateUserStats(u.wallet, { pointsEarned: playerPoints, level: lvl, won: winnerIdx === 0 })
          if (winnerIdx === 0) {
            const old = parseInt(localStorage.getItem('bb_points') || '0')
            localStorage.setItem('bb_points', String(old + finalScores[0]))
          }
        }
      },
    }
    return () => { delete window.BB_GAME_UI }
  }, [])

  // ── Start waiting for opponent (host only) ─────────────────────────────────
  function startWaiting(config) {
    waitConfigRef.current = config
    setGameConfig(config)
    setGameState('waiting')

    // Subscribe to this specific room's changes
    const sub = supabase
      .channel(`room-watch:${config.roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${config.roomId}` },
        (payload) => {
          const room = payload.new
          if (room.status === 'active' && room.guest_username) {
            // Opponent joined — store their name and start the game
            localStorage.setItem('bb_pvp_opponent', room.guest_username)
            waitSubRef.current?.unsubscribe?.()
            waitSubRef.current = null
            setGameConfig(prev => ({ ...prev, opponent: room.guest_username }))
            setGameState('playing')
          }
        }
      )
      .subscribe()

    waitSubRef.current = sub
  }

  // ── Cancel waiting — delete room and go back to lobby ─────────────────────
  async function cancelWaiting() {
    waitSubRef.current?.unsubscribe?.()
    waitSubRef.current = null
    const roomId = waitConfigRef.current?.roomId
    if (roomId) {
      await fetch(`/api/rooms?id=${roomId}`, { method: 'DELETE' }).catch(() => {})
    }
    waitConfigRef.current = null
    setGameConfig(null)
    setGameState('lobby')
  }

  function handleNextLevel() {
    const next = level + 1
    localStorage.setItem('bb_level', String(next))
    setLevel(next)
    setResult(null)
    setScores([0, 0])
    setGameState('playing')
  }

  const p2Name = gameConfig?.mode === 'pvp'
    ? (gameConfig.opponent || 'Player 2')
    : 'AI Dog'

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (gameState === 'lobby') return (
    <>
      <Head><title>BasketBattle – ANAGO ARENA</title></Head>
      <GameLobby
        gameId="basketball"
        gameName="BasketBattle"
        gameEmoji="🏀"
        accentColor="#C17A2A"
        onStartAI={({ level: lvl }) => {
          setLevel(parseInt(localStorage.getItem('bb_level') || '1'))
          setGameConfig({ mode: 'ai', level: lvl })
          setGameState('playing')
        }}
        onStartPVP={({ roomId, side, opponent }) => {
          const config = { mode: 'pvp', roomId, side, opponent }
          if (side === 'left') {
            // Host — wait for opponent to join
            startWaiting(config)
          } else {
            // Guest — opponent already in room, start immediately
            if (opponent) localStorage.setItem('bb_pvp_opponent', opponent)
            setGameConfig(config)
            setGameState('playing')
          }
        }}
      />
    </>
  )

  // ── WAITING FOR OPPONENT ───────────────────────────────────────────────────
  if (gameState === 'waiting') return (
    <>
      <Head><title>BasketBattle – Waiting...</title></Head>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #1E1540 0%, #2A1E6E 50%, #3A2490 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 32, padding: 24,
      }}>
        {/* Bouncing ball */}
        <div style={{ animation: 'loadBounce 0.6s ease-in-out infinite alternate' }}>
          <svg width={72} height={72} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" fill="#C17A2A" stroke="#2D2D2D" strokeWidth="2.5" />
            <path d="M6 8 C9 11 10 13.5 10 16 S9 21 6 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M26 8 C23 11 22 13.5 22 16 S23 21 26 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
            <line x1="2" y1="16" x2="30" y2="16" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p className="font-arcade" style={{
            fontSize: 'clamp(13px, 4vw, 20px)',
            color: '#F5EFE0',
            textShadow: '3px 3px 0 #2D2D2D',
            marginBottom: 12,
          }}>
            WAITING FOR
          </p>
          <p className="font-arcade" style={{
            fontSize: 'clamp(13px, 4vw, 20px)',
            color: '#C17A2A',
            textShadow: '3px 3px 0 #2D2D2D',
            marginBottom: 20,
            animation: 'loadPulse 1.2s ease-in-out infinite',
          }}>
            OPPONENT...
          </p>
          <p className="font-arcade" style={{ fontSize: 9, color: 'rgba(245,239,224,0.45)', lineHeight: 2 }}>
            Share this room with a friend.<br />
            Game starts when they join.
          </p>
        </div>

        {/* Animated dots */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 12, height: 12,
              borderRadius: '50%',
              background: '#C17A2A',
              border: '2px solid #2D2D2D',
              animation: `loadDot 1s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={cancelWaiting}
          className="font-arcade"
          style={{
            marginTop: 8,
            fontSize: 10, color: 'rgba(244,160,160,0.8)',
            background: 'rgba(30,21,64,0.8)',
            border: '2px solid rgba(244,160,160,0.4)',
            borderRadius: 8, padding: '10px 24px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <ArrowLeftIcon size={14} color="currentColor" /> CANCEL
        </button>

        <style>{`
          @keyframes loadBounce {
            from { transform: translateY(0px) scale(1); }
            to   { transform: translateY(-20px) scale(0.92); }
          }
          @keyframes loadPulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
          @keyframes loadDot {
            0%, 100% { transform: scale(1);   opacity: 0.4; }
            50%       { transform: scale(1.5); opacity: 1;   }
          }
        `}</style>
      </div>
    </>
  )

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (gameState === 'playing') return (
    <>
      <Head><title>BasketBattle – ANAGO ARENA</title></Head>

      {/* Three.js canvas */}
      <GameCanvas
        mode={gameConfig?.mode || 'ai'}
        level={level}
        user={user}
        room={gameConfig?.roomId}
      />

      {/* HUD overlay */}
      {!result && (
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="flex justify-between items-start p-3 gap-2">
            <div className="hud-panel">
              <p className="hud-score" style={{ color: '#C17A2A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <PawIcon size={12} color="#C17A2A" /> {user?.username || 'YOU'}
              </p>
              <p className="hud-score mt-1" style={{ color: '#F5EFE0' }}>{scores[0]} pts</p>
            </div>
            <div className="hud-panel text-center">
              <p className="hud-score" style={{ color: '#F4A0A0' }}>LVL {level}</p>
              <p className="hud-score mt-1" style={{ color: 'rgba(245,239,224,0.5)', fontSize: 8 }}>to 100</p>
            </div>
            <div className="hud-panel" style={{ textAlign: 'right' }}>
              <p className="hud-score" style={{ color: '#F4A0A0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                {p2Name} <PawIcon size={12} color="#F4A0A0" />
              </p>
              <p className="hud-score mt-1" style={{ color: '#F5EFE0' }}>{scores[1]} pts</p>
            </div>
          </div>

          {/* Quit button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => { setGameState('lobby'); setScores([0, 0]); setResult(null) }}
              className="font-arcade"
              style={{
                fontSize: 8, color: 'rgba(244,160,160,0.7)',
                background: 'rgba(30,21,64,0.7)',
                border: '2px solid rgba(91,63,219,0.4)',
                borderRadius: 8, padding: '6px 14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <ArrowLeftIcon size={12} color="currentColor" /> QUIT
            </button>
          </div>
        </div>
      )}

      {/* Stun flash */}
      {stunned && <div className="stun-overlay" />}

      {/* Score popups */}
      {scorePopups.map(p => (
        <div key={p.id} className="score-popup" style={{ left: p.x, top: p.y }}>
          +{p.pts}
        </div>
      ))}
    </>
  )

  // ── RESULT ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(15,8,40,0.9)' }}>
      <div className="result-screen cartoon-card w-full text-center" style={{
        maxWidth: 360, padding: '32px 24px',
        borderColor: result.winner === 0 ? '#C17A2A' : '#E05050',
        boxShadow: `4px 4px 0 #2D2D2D, 0 0 60px ${result.winner === 0 ? 'rgba(193,122,42,0.4)' : 'rgba(224,80,80,0.3)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {result.winner === 0 ? <TrophyIcon size={60} color="#F0B429" /> : <SkullIcon size={60} color="#E05050" />}
        </div>
        <h2 className="font-arcade" style={{
          fontSize: 'clamp(14px,4vw,22px)',
          color: result.winner === 0 ? '#F0B429' : '#E05050',
          textShadow: '3px 3px 0 #2D2D2D',
        }}>
          {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>

        <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'rgba(193,122,42,0.18)', border: '2px solid rgba(193,122,42,0.4)', borderRadius: 10, padding: '10px 16px' }}>
            <p className="font-arcade" style={{ fontSize: 10, color: '#C17A2A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <PawIcon size={12} color="#C17A2A" /> {user?.username}: {result.scores[0]} pts
            </p>
          </div>
          <div style={{ background: 'rgba(244,160,160,0.12)', border: '2px solid rgba(244,160,160,0.3)', borderRadius: 10, padding: '10px 16px' }}>
            <p className="font-arcade" style={{ fontSize: 10, color: '#F4A0A0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <PawIcon size={12} color="#F4A0A0" /> {p2Name}: {result.scores[1]} pts
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {result.winner === 0 && (
            <button className="btn-arcade gold w-full" style={{ fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleNextLevel}>
              <PawIcon size={14} color="currentColor" /> NEXT LEVEL
            </button>
          )}
          <button className="btn-arcade purple w-full" style={{ fontSize: 10 }}
            onClick={() => { setGameState('lobby'); setScores([0, 0]); setResult(null) }}>
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
