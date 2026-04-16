import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../../components/GameLobby'
import { upsertGameScore } from '../../lib/supabase'
import { TrophyIcon, SkullIcon, ArrowLeftIcon } from '../../components/Icons'

const FootballCanvas = dynamic(() => import('../../components/games/FootballCanvas'), { ssr: false })

export default function FootballPage() {
  const router = useRouter()
  const [gameState, setGameState] = useState('lobby')
  const [gameConfig, setGameConfig] = useState(null)
  const [result, setResult]   = useState(null)
  const [scores, setScores]   = useState([0, 0])
  const [user, setUser]       = useState(null)

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
          await upsertGameScore(u.wallet, 'football', { score: finalScores[0], won: winner === 0 })
          if (winner === 0) {
            const old = parseInt(localStorage.getItem('bb_points') || '0')
            localStorage.setItem('bb_points', String(old + finalScores[0] * 50))
          }
        }
      },
    }
    return () => { delete window.ANAGO_UI }
  }, [])

  // Auto-rotate to landscape when game starts, unlock when leaving
  useEffect(() => {
    if (gameState === 'playing') {
      try { screen.orientation?.lock?.('landscape').catch(() => {}) } catch {}
    } else {
      try { screen.orientation?.unlock?.() } catch {}
    }
    return () => {
      try { screen.orientation?.unlock?.() } catch {}
    }
  }, [gameState])

  if (gameState === 'lobby') return (
    <>
      <Head><title>Head Ball – ANAGO ARENA</title></Head>
      <GameLobby gameId="football" gameName="Head Ball" gameEmoji="⚽" accentColor="#27AE60"
        onStartAI={({ level }) => { setGameConfig({ mode: 'ai', level }); setGameState('playing') }}
        onStartPVP={({ roomId, side, opponent }) => { setGameConfig({ mode: 'pvp', roomId, side, opponent }); setGameState('playing') }}
      />
    </>
  )

  if (gameState === 'playing') return (
    <>
      <Head><title>Head Ball – ANAGO ARENA</title></Head>

      {/* Small non-blocking rotate hint — only shows in portrait, doesn't block game */}
      <div style={{
        position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, pointerEvents: 'none',
        background: 'rgba(30,21,64,0.92)',
        border: '2px solid #C17A2A',
        borderRadius: 8, padding: '6px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }} className="portrait-hint">
        <span style={{ fontSize: 18 }}>📱→</span>
        <span className="font-arcade" style={{ fontSize: 7, color: '#F5EFE0' }}>ROTATE PHONE</span>
        <style>{`@media (orientation: landscape) { .portrait-hint { display: none !important; } }`}</style>
      </div>

      <div className="fixed bottom-20 left-1/2 z-20 pointer-events-auto" style={{ transform: 'translateX(-50%)' }}>
        <button className="btn-arcade purple" style={{ fontSize: 7, padding: '6px 14px' }}
          onClick={() => { setGameState('lobby'); setScores([0, 0]) }}>
          QUIT
        </button>
      </div>
      <FootballCanvas config={gameConfig} />
    </>
  )

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(15,8,40,0.92)' }}>
      <div className="cartoon-card text-center" style={{ maxWidth: 340, padding: '32px 24px', borderColor: result.winner === 0 ? '#27AE60' : '#E05050' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {result.winner === 0 ? <TrophyIcon size={56} color="#F0B429" /> : <SkullIcon size={56} color="#E05050" />}
        </div>
        <h2 className="font-arcade" style={{ fontSize: 20, color: result.winner === 0 ? '#F0B429' : '#E05050', textShadow: '3px 3px 0 #2D2D2D' }}>
          {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>
        <p className="font-arcade mt-4" style={{ fontSize: 18, color: '#F5EFE0' }}>
          {result.scores[0]} – {result.scores[1]}
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button className="btn-arcade w-full" style={{ fontSize: 10, background: '#27AE60' }}
            onClick={() => { setGameState('playing'); setScores([0,0]); setResult(null) }}>PLAY AGAIN</button>
          <button className="btn-arcade purple w-full" style={{ fontSize: 10 }}
            onClick={() => setGameState('lobby')}>LOBBY</button>
          <button className="btn-arcade gold w-full" style={{ fontSize: 10 }}
            onClick={() => router.push('/arena')}>← ALL GAMES</button>
        </div>
      </div>
    </div>
  )
}
