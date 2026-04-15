import { supabase } from '../../supabase'

/**
 * PVPSync — thin wrapper around Supabase Realtime broadcast.
 *
 * Both clients join the same channel (game:<roomId>).
 * Every event carries a `side` field so each client knows
 * which player the action belongs to.
 *
 * Events:
 *   shot       { side, vx, vy }
 *   move       { side, targetX }
 *   stun       { side }           — the `side` player was just stunned
 *   score      { s0, s1 }         — sender's authoritative score snapshot
 *   game_end   { winnerSide, s0, s1 }
 *   ping       { side }           — connection heartbeat
 */
export class PVPSync {
  constructor(roomId, localSide) {
    this.roomId    = roomId
    this.localSide  = localSide                              // 'left' | 'right'
    this.remoteSide = localSide === 'left' ? 'right' : 'left'
    this.channel   = null
    this._cbs      = {}
    this._connected = false
    this._pingInterval = null
  }

  // ── Connect ──────────────────────────────────────────────

  connect() {
    this.channel = supabase.channel(`game:${this.roomId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    this.channel
      .on('broadcast', { event: 'shot' },     ({ payload }) => {
        if (payload.side === this.remoteSide) this._cbs.onRemoteShot?.(payload)
      })
      .on('broadcast', { event: 'move' },     ({ payload }) => {
        if (payload.side === this.remoteSide) this._cbs.onRemoteMove?.(payload)
      })
      .on('broadcast', { event: 'stun' },     ({ payload }) => {
        this._cbs.onRemoteStun?.(payload)
      })
      .on('broadcast', { event: 'score' },    ({ payload }) => {
        this._cbs.onRemoteScore?.(payload)
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        this._cbs.onRemoteGameEnd?.(payload)
      })
      .on('broadcast', { event: 'ping' },     () => {
        this._cbs.onPing?.()
      })
      .subscribe((status) => {
        this._connected = status === 'SUBSCRIBED'
        if (this._connected) {
          this._startPing()
          this._cbs.onConnected?.()
        }
      })

    return this
  }

  // ── Broadcasts ───────────────────────────────────────────

  broadcastShot(vx, vy) {
    this._send('shot', { side: this.localSide, vx, vy })
  }

  broadcastMove(bx, by) {
    this._send('move', { side: this.localSide, bx, by })
  }

  broadcastStun(side) {
    this._send('stun', { side })
  }

  broadcastScore(s0, s1) {
    this._send('score', { s0, s1 })
  }

  broadcastGameEnd(winnerSide, s0, s1) {
    this._send('game_end', { winnerSide, s0, s1 })
  }

  // ── Event callbacks ──────────────────────────────────────

  on(event, cb) {
    this._cbs[event] = cb
    return this
  }

  // ── Cleanup ──────────────────────────────────────────────

  disconnect() {
    clearInterval(this._pingInterval)
    this.channel?.unsubscribe()
    this.channel   = null
    this._connected = false
  }

  // ── Internal ─────────────────────────────────────────────

  _send(event, payload) {
    if (!this.channel) return
    this.channel.send({ type: 'broadcast', event, payload })
  }

  _startPing() {
    this._pingInterval = setInterval(() => {
      this._send('ping', { side: this.localSide })
    }, 5000)
  }
}
