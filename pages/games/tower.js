import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import GameLobby from '../../components/GameLobby'
import { upsertGameScore } from '../../lib/supabase'
import { TrophyIcon, SkullIcon, ArrowLeftIcon } from '../../components/Icons'

const TowerCanvas = dynamic(() => import('../../components/games/TowerCanvas'), { ssr: false })

export default function TowerPage() {
  const router = useRouter()
  const [gameState, setGameState] = useState('lobby')
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
        const s = localStorage.getItem('bb_user')
        if (s) {
          const u = JSON.parse(s)
          await upsertGameScore(u.wallet, 'tower', { score: finalScores[0], won: winner === 0 })
          // Only add points if player won
          if (winner === 0) {
            const old = parseInt(localStorage.getItem('bb_points') || '0')
            localStorage.setItem('bb_points', String(old + 50))
          }
        }
      },
    }
    return () => { delete window.ANAGO_UI }
  }, [])

  if (gameState === 'lobby') return (
    <>
      <Head><title>Bark Tower – ANAGO ARENA</title></Head>
      <GameLobby gameId="tower" gameName="Bark Tower" gameEmoji="🏗️" accentColor="#76D7C4"
        onStartAI={({ level }) => { setGameConfig({ mode: 'ai', level }); setGameState('playing') }}
        onStartPVP={({ roomId, side, opponent }) => { setGameConfig({ mode: 'pvp', roomId, side, opponent }); setGameState('playing') }}
      />
    </>
  )

  if (gameState === 'playing') return (
    <>
      <Head><title>Bark Tower – ANAGO ARENA</title></Head>
      <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center p-3 pointer-events-none">
        <div className="hud-panel"><p className="hud-score" style={{ color: '#76D7C4' }}>{user?.username || 'YOU'}: {scores[0]}</p></div>
        <div className="hud-panel"><p className="hud-score" style={{ fontSize: 8, color: '#F4A0A0' }}>BARK TOWER</p></div>
        <div className="hud-panel"><p className="hud-score" style={{ color: '#F4A0A0' }}>{gameConfig?.mode === 'pvp' ? (gameConfig.opponent || 'P2') : 'AI'}: {scores[1]}</p></div>
      </div>
      {/* Quit button */}
      <div className="fixed bottom-4 left-1/2 z-20 pointer-events-auto" style={{ transform: 'translateX(-50%)' }}>
        <button
          className="btn-arcade purple"
          style={{ fontSize: 8, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => { setGameState('lobby'); setScores([0, 0]) }}
        >
          <ArrowLeftIcon size={14} color="#F5EFE0" /> QUIT
        </button>
      </div>
      <TowerCanvas config={gameConfig} />
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
        <p className="font-arcade mt-3" style={{ fontSize: 12, color: '#F5EFE0' }}>Height: {result.scores[0]} blocks</p>
        <div className="flex flex-col gap-3 mt-6">
          <button className="btn-arcade w-full" style={{ fontSize: 10, background: '#76D7C4', color: '#2D2D2D' }}
            onClick={() => { setGameState('playing'); setScores([0, 0]); setResult(null) }}>
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
