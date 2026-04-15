import { supabase } from '../supabase'

/**
 * FootballSync — Supabase Realtime for 11v11 football PVP.
 * Events:
 *   input    { side, keys }          — player input state each frame
 *   goal     { side, s0, s1 }        — goal scored
 *   game_end { winnerSide, s0, s1 }
 *   ping     { side }
 */
export class FootballSync {
  constructor(roomId, localSide) {
    this.roomId     = roomId
    this.localSide  = localSide
    this.remoteSide = localSide === 'left' ? 'right' : 'left'
    this.channel    = null
    this._cbs       = {}
    this._connected = false
    this._pingInterval = null
  }

  connect() {
    this.channel = supabase.channel(`football:${this.roomId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    this.channel
      .on('broadcast', { event: 'input' },    ({ payload }) => {
        if (payload.side === this.remoteSide) this._cbs.onRemoteInput?.(payload)
      })
      .on('broadcast', { event: 'goal' },     ({ payload }) => {
        this._cbs.onGoal?.(payload)
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        this._cbs.onGameEnd?.(payload)
      })
      .on('broadcast', { event: 'ping' },     () => {
        this._cbs.onPing?.()
      })
      .subscribe(status => {
        this._connected = status === 'SUBSCRIBED'
        if (this._connected) {
          this._startPing()
          this._cbs.onConnected?.()
        }
      })
    return this
  }

  broadcastInput(keys) {
    this._send('input', { side: this.localSide, keys })
  }

  broadcastGoal(side, s0, s1) {
    this._send('goal', { side, s0, s1 })
  }

  broadcastGameEnd(winnerSide, s0, s1) {
    this._send('game_end', { winnerSide, s0, s1 })
  }

  on(event, cb) { this._cbs[event] = cb; return this }

  disconnect() {
    clearInterval(this._pingInterval)
    this.channel?.unsubscribe()
    this.channel = null
  }

  _send(event, payload) {
    this.channel?.send({ type: 'broadcast', event, payload })
  }

  _startPing() {
    this._pingInterval = setInterval(() => this._send('ping', { side: this.localSide }), 4000)
  }
}
