import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../../components/GameLobby'
import { upsertGameScore } from '../../lib/supabase'
import { TrophyIcon, SkullIcon, PawIcon } from '../../components/Icons'

const FootballCanvas = dynamic(() => import('../../components/games/FootballCanvas'), { ssr: false })

export default function FootballPage() {
  const [gameState, setGameState] = useState('lobby') // lobby | playing | result
  const [gameConfig, setGameConfig] = useState(null)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState([0, 0])
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (saved) setUser(JSON.parse(saved))

    window.ANAGO_UI = {
      updateScore: (s0, s1) => setScores([s0, s1]),
      showResult: async (winner, finalScores) => {
        setResult({ winner, scores: finalScores })
        setGameState('result')
        const saved = localStorage.getItem('bb_user')
        if (saved) {
          const u = JSON.parse(saved)
          await upsertGameScore(u.wallet, 'football', {
            score: Math.max(finalScores[0], finalScores[1]),
            won: winner === 0,
          })
          const oldPts = parseInt(localStorage.getItem('bb_points') || '0')
          localStorage.setItem('bb_points', String(oldPts + finalScores[0] * 10))
        }
      },
    }
    return () => { delete window.ANAGO_UI }
  }, [])

  if (gameState === 'lobby') {
    return (
      <>
        <Head><title>Dog Football – ANAGO ARENA</title></Head>
        <GameLobby
          gameId="football"
          gameName="Head Ball"
          gameEmoji="⚽"
          accentColor="#27AE60"
          onStartAI={({ level }) => { setGameConfig({ mode: 'ai', level }); setGameState('playing') }}
          onStartPVP={({ roomId, side, opponent }) => {
            setGameConfig({ mode: 'pvp', roomId, side, opponent })
            setGameState('playing')
          }}
        />
      </>
    )
  }

  if (gameState === 'playing') {
    return (
      <>
        <Head><title>Dog Football – ANAGO ARENA</title></Head>
        {/* HUD */}
        <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center p-3 pointer-events-none">
          <div className="hud-panel">
            <p className="hud-score" style={{ color: '#27AE60' }}>{user?.username || 'YOU'}</p>
            <p className="hud-score" style={{ color: '#F5EFE0' }}>{scores[0]}</p>
          </div>
          <div className="hud-panel text-center">
            <p className="hud-score" style={{ color: '#F4A0A0', fontSize: 8 }}>FOOTBALL</p>
          </div>
          <div className="hud-panel text-right">
            <p className="hud-score" style={{ color: '#F4A0A0' }}>{gameConfig?.mode === 'pvp' ? (gameConfig.opponent || 'P2') : 'AI'}</p>
            <p className="hud-score" style={{ color: '#F5EFE0' }}>{scores[1]}</p>
          </div>
        </div>
        <FootballCanvas config={gameConfig} />
      </>
    )
  }

  if (gameState === 'result') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(15,8,40,0.92)' }}>
        <div className="cartoon-card text-center" style={{ maxWidth: 340, padding: '32px 24px', borderColor: result.winner === 0 ? '#27AE60' : '#E05050' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {result.winner === 0 ? <TrophyIcon size={56} color="#F0B429" /> : <SkullIcon size={56} color="#E05050" />}
          </div>
          <h2 className="font-arcade" style={{ fontSize: 20, color: result.winner === 0 ? '#F0B429' : '#E05050', textShadow: '3px 3px 0 #2D2D2D' }}>
            {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
          </h2>
          <p className="font-arcade mt-4" style={{ fontSize: 14, color: '#F5EFE0' }}>
            {result.scores[0]} – {result.scores[1]}
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <button className="btn-arcade w-full" style={{ fontSize: 10, background: '#27AE60' }}
              onClick={() => { setGameState('playing'); setScores([0,0]); setResult(null) }}>
              PLAY AGAIN
            </button>
            <button className="btn-arcade purple w-full" style={{ fontSize: 10 }}
              onClick={() => setGameState('lobby')}>
              LOBBY
            </button>
          </div>
        </div>
      </div>
    )
  }
}
