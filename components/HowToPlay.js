import { useState } from 'react'
import {
  BasketballIcon, SendIcon, MousePointerIcon,
  ZapIcon, TrophyIcon, PawIcon,
} from './Icons'

const STEPS = [
  {
    Icon: BasketballIcon,
    iconColor: '#F0B429',
    title: 'Drag to Aim',
    desc: 'Touch and drag the ball to aim your shot. The further you drag, the more power!',
    tip: 'The arrow shows your trajectory',
  },
  {
    Icon: SendIcon,
    iconColor: '#FF8A65',
    title: 'Release to Shoot',
    desc: 'Let go to launch the ball. It flies with real physics — arc it into the hoop!',
    tip: 'Score = distance from hoop x level bonus',
  },
  {
    Icon: MousePointerIcon,
    iconColor: '#8B6FDB',
    title: 'Tap to Move',
    desc: 'After shooting, tap anywhere on screen. Your dog runs and jumps to that spot!',
    tip: 'Ball flies back to your hand automatically',
  },
  {
    Icon: ZapIcon,
    iconColor: '#FF4500',
    title: 'Stun Your Opponent',
    desc: 'Aim at the enemy dog instead of the hoop! Hit them to freeze them for 2 seconds.',
    tip: 'They can block — but get stunned if hit!',
  },
  {
    Icon: TrophyIcon,
    iconColor: '#F0B429',
    title: 'First to 100 Wins!',
    desc: 'Score points by sinking shots. Farther shots = more points. First to 100 wins!',
    tip: 'Hoop shrinks every 10 levels — good luck!',
  },
]

export default function HowToPlay({ onClose }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="modal-backdrop">
      <div
        className="how-to-box w-full max-w-sm"
        style={{
          background: '#2A1B5E',
          border: '3px solid #6B4FBB',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 0 50px rgba(107,79,187,0.6)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <p
            className="font-arcade text-xs mb-2"
            style={{ color: '#C4956A', letterSpacing: 2 }}
          >
            HOW TO PLAY
          </p>
          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? '#F0B429' : 'rgba(139,111,219,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step card */}
        <div
          key={step}
          style={{
            background: 'rgba(74,46,138,0.6)',
            border: '2px solid rgba(139,111,219,0.4)',
            borderRadius: 16,
            padding: '24px 20px',
            textAlign: 'center',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            animation: 'howToFadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <current.Icon size={52} color={current.iconColor} />
          </div>

          <h3
            className="font-arcade"
            style={{ color: '#F0B429', fontSize: 13, lineHeight: 1.6 }}
          >
            {current.title}
          </h3>

          <p
            style={{
              color: '#F5EFE0',
              fontSize: 11,
              lineHeight: 1.9,
              fontFamily: 'sans-serif',
              maxWidth: 280,
            }}
          >
            {current.desc}
          </p>

          <div
            style={{
              background: 'rgba(240,180,41,0.12)',
              border: '1px solid rgba(240,180,41,0.3)',
              borderRadius: 8,
              padding: '8px 14px',
            }}
          >
            <p style={{ color: '#F0B429', fontSize: 9, fontFamily: 'Press Start 2P, monospace', lineHeight: 1.7 }}>
              {current.tip}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-5">
          {step > 0 && (
            <button
              className="btn-arcade purple"
              style={{ flex: 1, fontSize: 10, padding: '10px 0' }}
              onClick={() => setStep(s => s - 1)}
            >
              BACK
            </button>
          )}

          {!isLast ? (
            <button
              className="btn-arcade"
              style={{ flex: 2, fontSize: 10, padding: '10px 0' }}
              onClick={() => setStep(s => s + 1)}
            >
              NEXT
            </button>
          ) : (
            <button
              className="btn-arcade gold"
              style={{ flex: 2, fontSize: 10, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={onClose}
            >
              <PawIcon size={14} color="currentColor" /> LET'S PLAY!
            </button>
          )}
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onClose}
            style={{
              display: 'block',
              margin: '14px auto 0',
              fontFamily: 'Press Start 2P, monospace',
              fontSize: 8,
              color: 'rgba(196,149,106,0.6)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  )
}
