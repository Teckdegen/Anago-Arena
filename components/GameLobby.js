/**
 * GameLobby — reusable lobby modal for any game.
 * Shows VS AI / VS Player options + open rooms list.
 * Used by all 6 games.
 */
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useDisconnect } from 'wagmi'
import { getOpenGameRooms, createGameRoom, joinRoom, subscribeToRooms } from '../lib/supabase'
import { BotIcon, UsersIcon, TrophyIcon, PawIcon, XIcon, PlusIcon, ArrowLeftIcon } from './Icons'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export default function GameLobby({ gameId, gameName, gameEmoji, accentColor = '#C17A2A', onStartAI, onStartPVP }) {
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

  useEffect(() => {
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
    try {
      const u = JSON.parse(saved)
      if (!u?.wallet || !u?.username) { router.replace('/'); return }
      setUser(u)
      setLevel(parseInt(localStorage.getItem('bb_level') || '1'))
      setTotalPoints(parseInt(localStorage.getItem('bb_points') || '0'))
    } catch { router.replace('/') }
  }, [])

  async function openRooms() {
    setShowRooms(true)
    setLoadingRooms(true)
    const { data } = await getOpenGameRooms(gameId)
    setRooms(data || [])
    setLoadingRooms(false)
    subRef.current = subscribeToRooms(({ eventType, new: nr, old: or }) => {
      if (nr?.game_id && nr.game_id !== gameId) return
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
    const { data, error } = await createGameRoom(user.wallet, user.username, gameId, level)
    if (!error && data) {
      localStorage.setItem('bb_room_id', data.id)
      localStorage.setItem('bb_room_side', 'left')
      closeRooms()
      onStartPVP?.({ roomId: data.id, side: 'left', opponent: null })
    }
  }

  async function handleJoinRoom(room) {
    if (!user || joining) return
    setJoining(room.id)
    const { data, error } = await joinRoom(room.id, user.wallet, user.username)
    if (!error && data) {
      localStorage.setItem('bb_room_id', data.id)
      localStorage.setItem('bb_room_side', 'right')
      closeRooms()
      onStartPVP?.({ roomId: data.id, side: 'right', opponent: data.host_username })
    } else {
      setJoining(null)
      const { data: fresh } = await getOpenGameRooms(gameId)
      setRooms(fresh || [])
    }
  }

  if (!user) return null

  const openList = rooms.filter(r => r.status === 'open' && !r.guest_wallet)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">

      {/* Back */}
      <button
        onClick={() => router.push('/arena')}
        style={{
          position: 'fixed', top: 16, left: 16,
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <ArrowLeftIcon size={32} color={accentColor} />
      </button>

      {/* Game header */}
      <div className="text-center mb-8">
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 10 }}>{gameEmoji}</div>
        <h1 className="font-arcade" style={{
          fontSize: 'clamp(14px,4vw,22px)',
          color: '#F5EFE0',
          textShadow: '3px 3px 0 #2D2D2D',
        }}>
          {gameName}
        </h1>
        <p className="font-arcade mt-2" style={{ fontSize: 8, color: accentColor }}>
          <PawIcon size={10} color={accentColor} style={{ display: 'inline', marginRight: 4 }} />
          {user.username} · {totalPoints.toLocaleString()} pts
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full" style={{ maxWidth: 340 }}>
        <button
          className="btn-arcade w-full"
          style={{
            fontSize: 12, padding: '18px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: accentColor,
            borderColor: '#2D2D2D',
          }}
          onClick={() => onStartAI?.({ level })}
        >
          <BotIcon size={20} color="#F5EFE0" /> VS AI
        </button>

        <button
          className="btn-arcade purple w-full"
          style={{ fontSize: 12, padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onClick={openRooms}
        >
          <UsersIcon size={20} color="#F5EFE0" /> VS PLAYER
        </button>

        <button
          className="btn-arcade gold w-full"
          style={{ fontSize: 12, padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onClick={() => router.push(`/leaderboard?game=${gameId}`)}
        >
          <TrophyIcon size={20} color="#2D2D2D" /> LEADERBOARD
        </button>
      </div>

      {/* Rooms modal */}
      {showRooms && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeRooms()}>
          <div className="modal-box">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-arcade" style={{ fontSize: 11, color: accentColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                <UsersIcon size={14} color={accentColor} /> Open Rooms
              </h2>
              <button onClick={closeRooms} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <XIcon size={20} color="#F4A0A0" />
              </button>
            </div>

            {loadingRooms && (
              <p className="font-arcade text-center py-6" style={{ fontSize: 9, color: accentColor }}>Loading...</p>
            )}

            {!loadingRooms && openList.length === 0 && (
              <p className="font-arcade text-center py-6" style={{ fontSize: 9, color: 'rgba(245,239,224,0.5)', lineHeight: 2 }}>
                No open rooms.<br/>Create one!
              </p>
            )}

            <div className="flex flex-col gap-2 mb-4" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {openList.map(room => (
                <div key={room.id} className="room-item">
                  <div>
                    <p className="font-arcade" style={{ fontSize: 10, color: '#F5EFE0', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PawIcon size={10} color={accentColor} /> {room.host_username}
                    </p>
                    <p className="font-arcade mt-1" style={{ fontSize: 8, color: '#F4A0A0' }}>
                      {shortenAddress(room.host_wallet)}
                    </p>
                  </div>
                  <button
                    className="btn-arcade"
                    style={{ fontSize: 9, padding: '8px 14px', background: accentColor }}
                    onClick={() => handleJoinRoom(room)}
                    disabled={joining === room.id}
                  >
                    {joining === room.id ? '...' : 'JOIN'}
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn-arcade gold w-full"
              style={{ fontSize: 10, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleCreateRoom}
            >
              <PlusIcon size={14} color="#2D2D2D" /> CREATE ROOM
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
