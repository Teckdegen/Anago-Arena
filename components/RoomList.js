import { useState, useEffect, useRef } from 'react'
import { getOpenRooms, subscribeToRooms } from '../lib/supabase'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

export default function RoomList({ onJoin }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState(null)
  const subRef = useRef(null)

  useEffect(() => {
    async function fetchRooms() {
      const { data } = await getOpenRooms()
      setRooms(data || [])
      setLoading(false)
    }
    fetchRooms()

    subRef.current = subscribeToRooms(({ eventType, new: newRow, old: oldRow }) => {
      if (eventType === 'INSERT') setRooms(r => [newRow, ...r])
      if (eventType === 'DELETE') setRooms(r => r.filter(x => x.id !== oldRow.id))
      if (eventType === 'UPDATE') setRooms(r => r.map(x => x.id === newRow.id ? newRow : x))
    })

    return () => subRef.current?.unsubscribe?.()
  }, [])

  async function handleJoin(room) {
    if (joiningId) return
    setJoiningId(room.id)
    try {
      await onJoin(room)
    } catch {
      setJoiningId(null)
    }
  }

  const openRooms = rooms.filter(r => r.status === 'open')

  if (loading) {
    return <p className="font-arcade text-xs text-gray-400 text-center py-4">Loading...</p>
  }

  if (openRooms.length === 0) {
    return (
      <p className="font-arcade text-xs text-gray-400 text-center py-4 leading-6">
        No open rooms.<br/>Create one below!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
      {openRooms.map(room => (
        <div
          key={room.id}
          className="flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-3"
        >
          <div>
            <p className="font-arcade text-xs text-white">{room.host_username}</p>
            <p className="font-arcade text-xs text-gray-400 mt-1">
              {shortenAddress(room.host_wallet)} · Lvl {room.level}
            </p>
          </div>
          <button
            className="btn-arcade text-xs py-2 px-3"
            onClick={() => handleJoin(room)}
            disabled={joiningId === room.id}
          >
            {joiningId === room.id ? '...' : 'JOIN'}
          </button>
        </div>
      ))}
    </div>
  )
}
