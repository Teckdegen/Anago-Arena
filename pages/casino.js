import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ArrowLeftIcon, DogIcon } from '../components/Icons'

export default function Casino() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
  }, [])

  if (!mounted) return null

  return (
    <>
      <Head>
        <title>Casino – ANAGO ARENA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">

        <button
          onClick={() => router.push('/select')}
          style={{ position: 'fixed', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeftIcon size={32} color="#5B3FDB" />
        </button>

        {/* Dog with slot machine */}
        <div style={{
          width: 100, height: 100,
          borderRadius: '50%',
          background: '#5B3FDB',
          border: '4px solid #2D2D2D',
          boxShadow: '5px 5px 0 #2D2D2D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 52,
        }}>
          🎰
        </div>

        <h1 className="font-arcade text-center" style={{
          fontSize: 'clamp(14px,4vw,22px)',
          color: '#F5EFE0',
          textShadow: '4px 4px 0 #2D2D2D',
          marginBottom: 12,
        }}>
          CASINO
        </h1>

        <div className="cartoon-card text-center" style={{ maxWidth: 360, padding: '28px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🐾🎲🃏</div>
          <p className="font-arcade" style={{ fontSize: 10, color: '#5B3FDB', marginBottom: 12 }}>
            COMING SOON
          </p>
          <p style={{ fontFamily: 'sans-serif', fontSize: 12, color: 'rgba(245,239,224,0.65)', lineHeight: 1.7 }}>
            Dog-themed casino games are on the way. Slots, Blackjack, Roulette and more — all with your wallet.
          </p>

          {/* Teaser game list */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { emoji: '🎰', name: 'Dog Slots',      status: 'SOON' },
              { emoji: '🃏', name: 'Paw Blackjack',  status: 'SOON' },
              { emoji: '🎡', name: 'Bone Roulette',  status: 'SOON' },
              { emoji: '🎲', name: 'Fetch Dice',     status: 'SOON' },
            ].map(g => (
              <div key={g.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(91,63,219,0.15)',
                border: '2px solid #2D2D2D',
                borderRadius: 10,
                padding: '8px 14px',
              }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#F5EFE0' }}>
                  {g.emoji} {g.name}
                </span>
                <span className="font-arcade" style={{
                  fontSize: 6, color: '#5B3FDB',
                  background: 'rgba(91,63,219,0.3)',
                  border: '2px solid #2D2D2D',
                  borderRadius: 4, padding: '2px 6px',
                }}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-arcade purple mt-8"
          style={{ fontSize: 10 }}
          onClick={() => router.push('/select')}
        >
          ← BACK TO ARENA
        </button>
      </div>
    </>
  )
}
