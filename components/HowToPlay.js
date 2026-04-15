import { useState } from 'react'
import { BasketballIcon, PawIcon, TrophyIcon, ZapIcon, TargetIcon } from './Icons'

// Game selector + per-game steps
const GAMES = [
  { id: 'basketball', label: 'BasketBattle', emoji: '🏀', color: '#C17A2A' },
  { id: 'football',   label: 'Head Ball',    emoji: '⚽', color: '#27AE60' },
]

const STEPS = {
  basketball: [
    {
      emoji: '🏀',
      title: 'Tap to Jump',
      desc: 'Tap anywhere on screen — your dog jumps to that spot. Go anywhere on the court!',
      tip: 'Farther from the hoop = more points when you score!',
    },
    {
      emoji: '🎯',
      title: 'Drag to Aim',
      desc: 'Touch near your dog and drag to aim. A curved arc shows exactly where the ball will go.',
      tip: 'Longer drag = more power',
    },
    {
      emoji: '🚀',
      title: 'Release to Shoot',
      desc: 'Let go to launch! Ball flies with real physics — gravity, bounce, and spin.',
      tip: 'Score = distance from hoop × level multiplier',
    },
    {
      emoji: '💥',
      title: 'Stun Opponent',
      desc: 'Aim at the enemy dog instead of the hoop! Hit them to freeze them for 2 seconds.',
      tip: 'They can block — but get stunned if the ball hits them!',
    },
    {
      emoji: '🏆',
      title: 'First to 100 Wins!',
      desc: 'Score points by sinking shots. Both players shoot simultaneously. First to 100 wins!',
      tip: 'Hoop gets smaller every 10 levels!',
    },
  ],
  football: [
    {
      emoji: '←→',
      title: 'Move',
      desc: 'Press ← → to run. You can\'t cross the centre line — stay on your side!',
      tip: 'Position yourself under the ball',
    },
    {
      emoji: '↑',
      title: 'Jump',
      desc: 'Press ↑ to jump. Time it right to head the ball toward the opponent\'s goal.',
      tip: 'Higher jump = more power on the header',
    },
    {
      emoji: '⚽',
      title: 'KICK (A)',
      desc: 'Press KICK for a power kick. When you\'re near the ball it launches with extra force.',
      tip: 'Combine jump + kick for a flying header!',
    },
    {
      emoji: '💥',
      title: 'TACKLE (T)',
      desc: 'Press TACKLE when close to the opponent. Knocks the ball away and sends them stumbling!',
      tip: 'Only works when you\'re right next to them',
    },
    {
      emoji: '🏆',
      title: 'Win!',
      desc: 'First to 5 goals wins. 90 second timer — whoever leads when time runs out wins!',
      tip: 'Works VS AI and PVP online',
    },
  ],
}

export default function HowToPlay({ onClose }) {
  const [activeGame, setActiveGame] = useState('basketball')
  const [step, setStep] = useState(0)

  const steps = STEPS[activeGame]
  const current = steps[step]
  const isLast = step === steps.length - 1
  const gameColor = GAMES.find(g => g.id === activeGame)?.color || '#C17A2A'

  function switchGame(id) {
    setActiveGame(id)
    setStep(0)
  }

  return (
    <div className="modal-backdrop">
      <div
        className="how-to-box w-full"
        style={{
          maxWidth: 380,
          background: '#1E1540',
          border: '4px solid #2D2D2D',
          borderRadius: 20,
          padding: 20,
          boxShadow: '5px 5px 0 #2D2D2D',
        }}
      >
        {/* Title */}
        <p className="font-arcade text-center mb-3" style={{ fontSize: 9, color: '#C17A2A', letterSpacing: 2 }}>
          HOW TO PLAY
        </p>

        {/* Game selector tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => switchGame(g.id)}
              style={{
                flex: 1,
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 7,
                padding: '7px 4px',
                borderRadius: 8,
                border: `3px solid ${activeGame === g.id ? g.color : '#2D2D2D'}`,
                boxShadow: activeGame === g.id ? `3px 3px 0 #2D2D2D` : '2px 2px 0 #2D2D2D',
                background: activeGame === g.id ? g.color : 'rgba(42,30,110,0.7)',
                color: activeGame === g.id ? '#1A1008' : 'rgba(245,239,224,0.5)',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {g.emoji}
            </button>
          ))}
        </div>

        {/* Game name */}
        <p className="font-arcade text-center mb-3" style={{ fontSize: 8, color: gameColor }}>
          {GAMES.find(g => g.id === activeGame)?.label}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 22 : 8, height: 8,
                borderRadius: 4,
                background: i === step ? gameColor : 'rgba(91,63,219,0.4)',
                border: '2px solid #2D2D2D',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step card */}
        <div
          key={`${activeGame}-${step}`}
          style={{
            background: 'rgba(42,30,110,0.7)',
            border: '3px solid #2D2D2D',
            borderRadius: 14,
            boxShadow: '3px 3px 0 #2D2D2D',
            padding: '18px 14px',
            textAlign: 'center',
            minHeight: 200,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12,
            animation: 'howToFadeIn 0.3s ease',
          }}
        >
          {/* Emoji icon */}
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: '#2A1E6E',
            border: '3px solid #2D2D2D',
            boxShadow: '3px 3px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            {current.emoji}
          </div>

          <h3 className="font-arcade" style={{
            color: gameColor, fontSize: 11, lineHeight: 1.7,
            textShadow: '2px 2px 0 #2D2D2D',
          }}>
            {current.title}
          </h3>

          <p style={{
            color: '#F5EFE0', fontSize: 11, lineHeight: 1.8,
            fontFamily: 'sans-serif', maxWidth: 300,
          }}>
            {current.desc}
          </p>

          <div style={{
            background: `rgba(${activeGame === 'basketball' ? '193,122,42' : activeGame === 'football' ? '39,174,96' : '232,160,32'},0.18)`,
            border: `2px solid rgba(${activeGame === 'basketball' ? '193,122,42' : activeGame === 'football' ? '39,174,96' : '232,160,32'},0.5)`,
            borderRadius: 8, padding: '6px 12px',
          }}>
            <p className="font-arcade" style={{ color: gameColor, fontSize: 7, lineHeight: 1.8 }}>
              💡 {current.tip}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {step > 0 && (
            <button className="btn-arcade purple" style={{ flex: 1, fontSize: 9, padding: '10px 0' }}
              onClick={() => setStep(s => s - 1)}>
              ← BACK
            </button>
          )}
          {!isLast ? (
            <button className="btn-arcade" style={{ flex: 2, fontSize: 9, padding: '10px 0', background: gameColor }}
              onClick={() => setStep(s => s + 1)}>
              NEXT →
            </button>
          ) : (
            <button className="btn-arcade gold" style={{ flex: 2, fontSize: 9, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={onClose}>
              <PawIcon size={14} color="#2D2D2D" /> LET'S PLAY!
            </button>
          )}
        </div>

        {!isLast && (
          <button onClick={onClose} style={{
            display: 'block', margin: '10px auto 0',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7, color: 'rgba(244,160,160,0.5)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  )
}
