import { supabase } from '../../supabase'

/**
 * PVPSync — Supabase Realtime broadcast wrapper.
 *
 * Events:
 *   shot       { side, vx, vy }
 *   move       { side, targetX, targetY }
 *   stun       { side }
 *   score      { s0, s1 }
 *   game_end   { winnerSide, s0, s1 }
 *   ready      { side }           — sent once on connect so both sides know opponent is live
 *   ping       { side, ts }       — heartbeat every 3s
 *   pong       { side, ts }       — reply to ping
 */
export class PVPSync {
  constructor(roomId, localSide) {
    this.roomId     = roomId
    this.localSide  = localSide
    this.remoteSide = localSide === 'left' ? 'right' : 'left'
    this.channel    = null
    this._cbs       = {}
    this._connected  = false
    this._pingInterval  = null
    this._watchdogTimer = null
    this._lastPongAt    = Date.now()
    this._DISCONNECT_MS = 12000   // 12s without pong = opponent gone
    this._gameEnded     = false   // prevent double game_end
  }

  // ── Connect ──────────────────────────────────────────────

  connect() {
    this.channel = supabase.channel(`game:${this.roomId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    this.channel
      .on('broadcast', { event: 'shot' }, ({ payload }) => {
        if (payload.side === this.remoteSide) this._cbs.onRemoteShot?.(payload)
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (payload.side === this.remoteSide) this._cbs.onRemoteMove?.(payload)
      })
      .on('broadcast', { event: 'stun' }, ({ payload }) => {
        this._cbs.onRemoteStun?.(payload)
      })
      .on('broadcast', { event: 'score' }, ({ payload }) => {
        this._cbs.onRemoteScore?.(payload)
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        // Only fire once — guard against both clients broadcasting simultaneously
        if (this._gameEnded) return
        this._gameEnded = true
        this._cbs.onRemoteGameEnd?.(payload)
      })
      .on('broadcast', { event: 'ready' }, ({ payload }) => {
        if (payload.side === this.remoteSide) {
          this._lastPongAt = Date.now()
          this._cbs.onOpponentReady?.()
        }
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        if (payload.side === this.remoteSide) {
          this._lastPongAt = Date.now()
          // Reply with pong
          this._send('pong', { side: this.localSide, ts: payload.ts })
        }
      })
      .on('broadcast', { event: 'pong' }, ({ payload }) => {
        if (payload.side === this.remoteSide) {
          this._lastPongAt = Date.now()
        }
      })
      .subscribe((status) => {
        this._connected = status === 'SUBSCRIBED'
        if (this._connected) {
          // Announce presence to opponent
          this._send('ready', { side: this.localSide })
          this._startHeartbeat()
          this._cbs.onConnected?.()
        }
      })

    return this
  }

  // ── Broadcasts ───────────────────────────────────────────

  broadcastShot(vx, vy) {
    this._send('shot', { side: this.localSide, vx, vy })
  }

  broadcastMove(targetX, targetY) {
    this._send('move', { side: this.localSide, targetX, targetY: targetY || 0 })
  }

  broadcastStun(side) {
    this._send('stun', { side })
  }

  broadcastScore(s0, s1) {
    this._send('score', { s0, s1 })
  }

  broadcastGameEnd(winnerSide, s0, s1) {
    if (this._gameEnded) return   // don't double-send
    this._gameEnded = true
    this._send('game_end', { winnerSide, s0, s1 })
  }
  // ── Event callbacks ──────────────────────────────────────

  on(event, cb) {
    this._cbs[event] = cb
    return this
  }

  // ── Cleanup ──────────────────────────────────────────────

  disconnect() {
    this._stopHeartbeat()
    this.channel?.unsubscribe()
    this.channel    = null
    this._connected = false
  }

  // ── Internal ─────────────────────────────────────────────

  _send(event, payload) {
    if (!this.channel || !this._connected) return
    this.channel.send({ type: 'broadcast', event, payload })
  }

  _startHeartbeat() {
    // Ping every 3 seconds
    this._pingInterval = setInterval(() => {
      this._send('ping', { side: this.localSide, ts: Date.now() })
    }, 3000)

    // Watchdog: check if we've heard from opponent recently
    this._watchdogTimer = setInterval(() => {
      const silent = Date.now() - this._lastPongAt
      if (silent > this._DISCONNECT_MS && !this._gameEnded) {
        this._cbs.onOpponentDisconnect?.()
      }
    }, 4000)
  }

  _stopHeartbeat() {
    clearInterval(this._pingInterval)
    clearInterval(this._watchdogTimer)
    this._pingInterval  = null
    this._watchdogTimer = null
  }
}
