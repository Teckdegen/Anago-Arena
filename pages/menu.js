import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useDisconnect } from 'wagmi'
import { getOpenRooms, createRoom, joinRoom, subscribeToRooms } from '../lib/supabase'
import {
  DogIcon, PawIcon, BotIcon, UsersIcon, TrophyIcon,
  XIcon, PlusIcon,
} from '../components/Icons'

function shortenAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Inline season lookup — avoids importing game modules at page level
// Mirrors COURT_THEMES order in lib/game/config.js (10 themes, index = level % 10)
const THEME_SEASONS = [
  'summer', 'summer', 'autumn', 'autumn',
  'winter', 'winter', 'spring', 'spring',
  'night',  'night',
]
function getSeasonForLevel(level) {
  const n = Math.max(1, parseInt(level) || 1)
  return THEME_SEASONS[n % THEME_SEASONS.length] || 'summer'
}

const SEASON_EMOJI = { summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌸', night: '🌙' }

function SeasonBadge({ season }) {
  return (
    <span className={`season-badge ${season}`}>
      {SEASON_EMOJI[season] || '🏀'} {season}
    </span>
  )
}

export default function Menu() {
  const router = useRouter()
  const { disconnect } = useDisconnect()
  const [user, setUser] = useState(null)
  const [level, setLevel] = useState(1)
  const [totalPoints, setTotalPoints] = useState(0)
  const [showRooms, setShowRooms] = useState(false)
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [joining, setJoining] = useState(null)
  const subRef = useRef(null)

  // Current level's theme info
  const [levelTheme, setLevelTheme] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.push('/'); return }
    const u = JSON.parse(saved)
    setUser(u)
    const lvl = parseInt(localStorage.getItem('bb_level') || '1')
    setLevel(lvl)
    setTotalPoints(parseInt(localStorage.getItem('bb_points') || '0'))
    setLevelTheme({ season: getSeasonForLevel(lvl) })
  }, [])

  async function openRooms() {
    setShowRooms(true)
    setLoadingRooms(true)
    const { data } = await getOpenRooms()
    setRooms(data || [])
    setLoadingRooms(false)
    subRef.current = subscribeToRooms(({ eventType, new: nr, old: or }) => {
      if (eventType === 'INSERT') setRooms(r => [nr, ...r])
      if (eventType === 'DELETE') setRooms(r => r.filter(x => x.id !== or.id))
      if (eventType === 'UPDATE') setRooms(r => r.map(x => x.id === nr.id ? nr : x))
    })
  }

  function closeRooms() {
    setShowRooms(false)
    subRef.current?.unsubscribe?.()
    subRef.current = null
  }

  async function handleCreateRoom() {
    if (!user) return
    const { data, error } = await createRoom(user.wallet, user.username, level)
    if (!error && data) {
      localStorage.setItem('bb_room_id', data.id)
      localStorage.setItem('bb_room_side', 'left')
      router.push(`/game?mode=pvp&room=${data.id}`)
    }
  }

  async function handleJoinRoom(room) {
    if (!user || joining) return
    setJoining(room.id)
    const { data, error } = await joinRoom(room.id, user.wallet, user.username)
    if (!error && data) {
      localStorage.setItem('bb_room_id', data.id)
      localStorage.setItem('bb_room_side', 'right')
      router.push(`/game?mode=pvp&room=${data.id}`)
    } else {
      setJoining(null)
      alert('Room no longer available.')
      const { data: fresh } = await getOpenRooms()
      setRooms(fresh || [])
    }
  }

  if (!user) return null

  const openList = rooms.filter(r => r.status === 'open' && !r.guest_wallet)

  return (
    <>
      <Head>
        <title>BasketBattle – Menu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">

        {/* Logo */}
        <div className="text-center mb-6">
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: '#5B3FDB',
            border: '3px solid #2D2D2D',
            boxShadow: '3px 3px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
          }}>
            <DogIcon size={40} color="#C17A2A" />
          </div>
          <h1 className="font-arcade" style={{
            fontSize: 'clamp(13px,4vw,20px)',
            color: '#F5EFE0',
            textShadow: '2px 2px 0 #2D2D2D',
          }}>
            BasketBattle
          </h1>
        </div>

        {/* User card */}
        <div
          className="cartoon-card w-full mb-6"
          style={{ maxWidth: 360, padding: '14px 18px' }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-arcade" style={{
                fontSize: 11, color: '#C17A2A',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <PawIcon size={12} color="#C17A2A" /> {user.username}
              </p>
              <p className="font-arcade mt-1" style={{ fontSize: 8, color: '#F4A0A0' }}>
                {shortenAddress(user.wallet)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-arcade" style={{ fontSize: 11, color: '#F5EFE0' }}>
                LVL {level}
              </p>
              <p className="font-arcade mt-1" style={{ fontSize: 9, color: '#F0B429' }}>
                {totalPoints.toLocaleString()} pts
              </p>
              {levelTheme && (
                <div className="mt-1">
                  <SeasonBadge season={levelTheme.season} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-4 w-full" style={{ maxWidth: 360 }}>
          <button
            className="btn-arcade w-full"
            style={{ fontSize: 12, padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={() => router.push(`/game?mode=ai&level=${level}`)}
          >
            <BotIcon size={18} color="currentColor" /> VS AI
          </button>

          <button
            className="btn-arcade purple w-full"
            style={{ fontSize: 12, padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={openRooms}
          >
            <UsersIcon size={18} color="currentColor" /> VS PLAYER
          </button>

          <button
            className="btn-arcade gold w-full"
            style={{ fontSize: 12, padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={() => router.push('/leaderboard')}
          >
            <TrophyIcon size={18} color="currentColor" /> LEADERBOARD
          </button>
        </div>

        <button
          onClick={() => {
            disconnect()
            localStorage.removeItem('bb_user')
            router.push('/')
          }}
          className="mt-8 font-arcade"
          style={{
            fontSize: 7, color: 'rgba(244,160,160,0.4)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Disconnect Wallet
        </button>
      </div>

      {/* Rooms modal */}
      {showRooms && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeRooms()}>
          <div className="modal-box">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-arcade" style={{
                fontSize: 12, color: '#C17A2A',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <UsersIcon size={16} color="#C17A2A" /> Open Rooms
              </h2>
              <button
                onClick={closeRooms}
                style={{ color: '#F4A0A0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <XIcon size={20} color="#F4A0A0" />
              </button>
            </div>

            {loadingRooms && (
              <p className="font-arcade text-center py-6" style={{ fontSize: 9, color: '#C17A2A' }}>
                Loading...
              </p>
            )}

            {!loadingRooms && openList.length === 0 && (
              <p className="font-arcade text-center py-6" style={{ fontSize: 9, color: 'rgba(245,239,224,0.5)', lineHeight: 2 }}>
                No open rooms yet.<br/>Create one below!
              </p>
            )}

            <div className="flex flex-col gap-2 mb-4" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {openList.map(room => {
                const roomSeason = getSeasonForLevel(room.level || 1)
                return (
                  <div key={room.id} className="room-item">
                    <div>
                      <p className="font-arcade" style={{
                        fontSize: 10, color: '#F5EFE0',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <PawIcon size={10} color="#C17A2A" /> {room.host_username}
                      </p>
                      <p className="font-arcade mt-1" style={{ fontSize: 8, color: '#F4A0A0' }}>
                        {shortenAddress(room.host_wallet)} · Lvl {room.level}
                      </p>
                      <div className="mt-1">
                        <SeasonBadge season={roomSeason} />
                      </div>
                    </div>
                    <button
                      className="btn-arcade"
                      style={{ fontSize: 9, padding: '8px 14px' }}
                      onClick={() => handleJoinRoom(room)}
                      disabled={joining === room.id}
                    >
                      {joining === room.id ? '...' : 'JOIN'}
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              className="btn-arcade gold w-full"
              style={{ fontSize: 10, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleCreateRoom}
            >
              <PlusIcon size={14} color="currentColor" /> CREATE ROOM
            </button>
          </div>
        </div>
      )}
    </>
  )
}
