import { useState } from 'react'
import {
  BasketballIcon, SendIcon, MousePointerIcon,
  ZapIcon, TrophyIcon, PawIcon, TargetIcon,
} from './Icons'

const STEPS = [
  {
    Icon: BasketballIcon,
    iconColor: '#C17A2A',
    title: 'Drag to Aim',
    desc: 'Touch and drag the ball to aim your shot. The further you drag, the more power!',
    tip: 'Arrow shows your trajectory',
  },
  {
    Icon: SendIcon,
    iconColor: '#5B3FDB',
    title: 'Release to Shoot',
    desc: 'Let go to launch the ball. It flies with real physics — arc it into the hoop!',
    tip: 'Score = distance × level bonus',
  },
  {
    Icon: MousePointerIcon,
    iconColor: '#F5EFE0',
    title: 'Tap to Move',
    desc: 'After shooting, tap anywhere on screen. Your dog jumps to that spot with gravity!',
    tip: 'Ball flies back to your hand',
  },
  {
    Icon: TargetIcon,
    iconColor: '#E05050',
    title: 'Stun Your Opponent',
    desc: 'Aim at the enemy dog instead of the hoop! Hit them to freeze them for 2 seconds.',
    tip: 'They can block — but get stunned if hit!',
  },
  {
    Icon: TrophyIcon,
    iconColor: '#F0B429',
    title: 'First to 100 Wins!',
    desc: 'Score points by sinking shots. Farther shots = more points. First to 100 wins!',
    tip: 'Hoop shrinks every 10 levels!',
  },
]

export default function HowToPlay({ onClose }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="modal-backdrop">
      <div
        className="how-to-box w-full"
        style={{
          maxWidth: 360,
          background: '#1E1540',
          border: '4px solid #2D2D2D',
          borderRadius: 20,
          padding: 24,
          boxShadow: '5px 5px 0 #2D2D2D, 0 0 40px rgba(91,63,219,0.5)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <p className="font-arcade" style={{ fontSize: 9, color: '#C17A2A', letterSpacing: 2 }}>
            HOW TO PLAY
          </p>
          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? '#C17A2A' : 'rgba(91,63,219,0.4)',
                  border: '2px solid #2D2D2D',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step card */}
        <div
          key={step}
          style={{
            background: 'rgba(42,30,110,0.7)',
            border: '3px solid #2D2D2D',
            borderRadius: 14,
            boxShadow: '3px 3px 0 #2D2D2D',
            padding: '20px 16px',
            textAlign: 'center',
            minHeight: 210,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            animation: 'howToFadeIn 0.3s ease',
          }}
        >
          {/* Icon in a circle */}
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: '#2A1E6E',
            border: '3px solid #2D2D2D',
            boxShadow: '3px 3px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <current.Icon size={40} color={current.iconColor} />
          </div>

          <h3 className="font-arcade" style={{ color: '#F0B429', fontSize: 11, lineHeight: 1.7, textShadow: '2px 2px 0 #2D2D2D' }}>
            {current.title}
          </h3>

          <p style={{ color: '#F5EFE0', fontSize: 11, lineHeight: 1.9, fontFamily: 'sans-serif', maxWidth: 280 }}>
            {current.desc}
          </p>

          {/* Tip bubble */}
          <div style={{
            background: 'rgba(193,122,42,0.18)',
            border: '2px solid rgba(193,122,42,0.5)',
            borderRadius: 8,
            padding: '7px 12px',
          }}>
            <p className="font-arcade" style={{ color: '#C17A2A', fontSize: 8, lineHeight: 1.8 }}>
              💡 {current.tip}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {step > 0 && (
            <button
              className="btn-arcade purple"
              style={{ flex: 1, fontSize: 9, padding: '10px 0' }}
              onClick={() => setStep(s => s - 1)}
            >
              ← BACK
            </button>
          )}

          {!isLast ? (
            <button
              className="btn-arcade"
              style={{ flex: 2, fontSize: 9, padding: '10px 0' }}
              onClick={() => setStep(s => s + 1)}
            >
              NEXT →
            </button>
          ) : (
            <button
              className="btn-arcade gold"
              style={{ flex: 2, fontSize: 9, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={onClose}
            >
              <PawIcon size={14} color="#2D2D2D" /> LET'S PLAY!
            </button>
          )}
        </div>

        {!isLast && (
          <button
            onClick={onClose}
            style={{
              display: 'block', margin: '12px auto 0',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 7, color: 'rgba(244,160,160,0.5)',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  )
}
