import { useState, useEffect } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../../components/GameLobby'
import { upsertGameScore } from '../../lib/supabase'
import { TrophyIcon, SkullIcon } from '../../components/Icons'

const PongCanvas = dynamic(() => import('../../components/games/PongCanvas'), { ssr: false })

export default function PongPage() {
  const [gameState, setGameState] = useState('lobby')
  const [gameConfig, setGameConfig] = useState(null)
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState([3, 3])
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
          await upsertGameScore(u.wallet, 'pong', { score: finalScores[0], won: winner === 0 })
          const old = parseInt(localStorage.getItem('bb_points') || '0')
          localStorage.setItem('bb_points', String(old + (winner === 0 ? 50 : 10)))
        }
      },
    }
    return () => { delete window.ANAGO_UI }
  }, [])

  if (gameState === 'lobby') return (
    <>
      <Head><title>Paw Pong – ANAGO ARENA</title></Head>
      <GameLobby gameId="pong" gameName="Paw Pong" gameEmoji="🏓" accentColor="#5B3FDB"
        onStartAI={({ level }) => { setGameConfig({ mode: 'ai', level }); setGameState('playing') }}
        onStartPVP={({ roomId, side, opponent }) => { setGameConfig({ mode: 'pvp', roomId, side, opponent }); setGameState('playing') }}
      />
    </>
  )

  if (gameState === 'playing') return (
    <>
      <Head><title>Paw Pong – ANAGO ARENA</title></Head>
      <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center p-3 pointer-events-none">
        <div className="hud-panel"><p className="hud-score" style={{ color: '#5B3FDB' }}>❤️ {scores[0]}</p></div>
        <div className="hud-panel"><p className="hud-score" style={{ fontSize: 8, color: '#F4A0A0' }}>LIVES</p></div>
        <div className="hud-panel"><p className="hud-score" style={{ color: '#F4A0A0' }}>❤️ {scores[1]}</p></div>
      </div>
      <PongCanvas config={gameConfig} />
    </>
  )

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: 'rgba(15,8,40,0.92)' }}>
      <div className="cartoon-card text-center" style={{ maxWidth: 340, padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {result.winner === 0 ? <TrophyIcon size={56} color="#F0B429" /> : <SkullIcon size={56} color="#E05050" />}
        </div>
        <h2 className="font-arcade" style={{ fontSize: 20, color: result.winner === 0 ? '#F0B429' : '#E05050', textShadow: '3px 3px 0 #2D2D2D' }}>
          {result.winner === 0 ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>
        <div className="flex flex-col gap-3 mt-6">
          <button className="btn-arcade w-full" style={{ fontSize: 10, background: '#5B3FDB' }}
            onClick={() => { setGameState('playing'); setScores([3,3]); setResult(null) }}>PLAY AGAIN</button>
          <button className="btn-arcade purple w-full" style={{ fontSize: 10 }}
            onClick={() => setGameState('lobby')}>LOBBY</button>
        </div>
      </div>
    </div>
  )
}
