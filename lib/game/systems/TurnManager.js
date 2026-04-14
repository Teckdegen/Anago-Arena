import { GAME_CONFIG } from '../config.js'

export class TurnManager {
  constructor({
    player1, player2, ball1, ball2, hoop,
    inputSystem, playerSystem, ballSystem, aiSystem,
    dragArrow, scoreSystem, levelConfig,
    onStun, THREE, CANNON,
    pvpSync, localSide,
  }) {
    this.p1 = player1
    this.p2 = player2
    this.b1 = ball1
    this.b2 = ball2
    this.hoop = hoop
    this.input = inputSystem
    this.playerSystem = playerSystem
    this.ballSystem = ballSystem
    this.ai = aiSystem
    this.dragArrow = dragArrow
    this.scoreSystem = scoreSystem
    this.levelConfig = levelConfig
    this._onStun = onStun
    this.THREE = THREE
    this.CANNON = CANNON

    this.pvpSync   = pvpSync   || null
    this.localSide = localSide || 'left'
    this._isPVP    = !!pvpSync

    // Single source of truth — one state per player side
    // 'holding' | 'dragging' | 'ball_in_flight' | 'waiting' | 'repositioning' | 'ball_returning' | 'stunned'
    this._state = { left: 'holding', right: 'holding' }

    // Per-side drag tracking
    this._drag      = { left: false, right: false }
    this._dragStart = { left: null,  right: null  }

    this._stunNotified = { left: false, right: false }
  }

  // ── Helpers ───────────────────────────────────────────────

  _getState(side)        { return this._state[side] }
  _setState(side, value) {
    this._state[side] = value
    // Keep player.state in sync
    const player = side === 'left' ? this.p1 : this.p2
    player.state = value
  }

  _playerForSide(side)  { return side === 'left' ? this.p1 : this.p2 }
  _ballForSide(side)    { return side === 'left' ? this.b1 : this.b2 }

  // ── Start ─────────────────────────────────────────────────

  start() {
    this._setState('left',  'holding')
    this._setState('right', 'holding')
    this.b1.attachTo(this.p1)
    this.b2.attachTo(this.p2)

    if (this._isPVP) {
      this._startPVP()
    } else {
      this._startAI()
    }
  }

  // ── AI mode ───────────────────────────────────────────────

  _startAI() {
    this.ai.activate()
    this._bindInput('left')
    this._triggerAIShot()
  }

  // ── PVP mode ──────────────────────────────────────────────

  _startPVP() {
    this._bindInput(this.localSide)

    const remoteSide = this.pvpSync.remoteSide

    this.pvpSync
      .on('onRemoteShot', ({ vx, vy }) => {
        if (this._getState(remoteSide) !== 'holding') return
        const player = this._playerForSide(remoteSide)
        const ball   = this._ballForSide(remoteSide)
        if (player.stunned) return
        ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
        this._setState(remoteSide, 'ball_in_flight')
        player.shootAnimation(new this.THREE.Vector3(vx, vy, 0))
      })
      .on('onRemoteMove', ({ targetX }) => {
        if (this._getState(remoteSide) !== 'waiting') return
        const player  = this._playerForSide(remoteSide)
        const ball    = this._ballForSide(remoteSide)
        const clamped = this._clampForSide(remoteSide, targetX)
        this._setState(remoteSide, 'repositioning')
        this.playerSystem.startReposition(player, new this.THREE.Vector3(clamped, 0, 0), () => {
          this._setState(remoteSide, 'ball_returning')
          ball.returnTo(player)
        })
      })
      .on('onRemoteStun', ({ side }) => {
        const player = this._playerForSide(side)
        player.stun()
        if (this._onStun) this._onStun(side)
        window.BB_GAME_UI?.showStun(side)
      })
      .on('onRemoteScore', ({ s0, s1 }) => {
        this.scoreSystem.reconcile(s0, s1)
        window.BB_GAME_UI?.updateScore(s0, s1)
      })
      .on('onRemoteGameEnd', ({ winnerSide, s0, s1 }) => {
        const winnerIdx = winnerSide === 'left' ? 0 : 1
        this.scoreSystem.forceEnd(winnerIdx, [s0, s1])
      })
  }

  // ── Input binding ─────────────────────────────────────────

  _bindInput(side) {
    const isPVP = this._isPVP

    this.input.onPointerDown((worldPos) => {
      if (this._getState(side) !== 'holding') return
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      const dist = worldPos.distanceTo(ball.mesh.position)
      if (dist < 1.8) {
        this._drag[side]      = true
        this._dragStart[side] = worldPos.clone()
        this._setState(side, 'dragging')
      }
    })

    this.input.onPointerMove((worldPos) => {
      if (!this._drag[side]) return
      this.dragArrow.update(this._dragStart[side], worldPos, this.levelConfig.gravity)
    })

    this.input.onPointerUp((worldPos) => {
      if (!this._drag[side]) return
      this._drag[side] = false
      this.dragArrow.hide()

      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      const start  = this._dragStart[side]

      const dx       = start.x - worldPos.x
      const dy       = start.y - worldPos.y
      const rawPower = Math.sqrt(dx * dx + dy * dy)
      const power    = Math.max(GAME_CONFIG.DRAG_MIN_POWER, Math.min(GAME_CONFIG.DRAG_MAX_POWER, rawPower * 2.2))

      const vx = dx * 0.5 * power
      const vy = Math.abs(dy) * 0.5 * power + power * 0.45

      ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
      this._setState(side, 'ball_in_flight')
      player.shootAnimation(new this.THREE.Vector3(dx, dy, 0))

      if (isPVP) this.pvpSync.broadcastShot(vx, vy)
    })

    this.input.onTap((worldPos) => {
      if (this._getState(side) !== 'waiting') return
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      const targetX = this._clampForSide(side, worldPos.x)
      this._setState(side, 'repositioning')
      if (isPVP) this.pvpSync.broadcastMove(targetX)

      this.playerSystem.startReposition(player, new this.THREE.Vector3(targetX, 0, 0), () => {
        this._setState(side, 'ball_returning')
        ball.returnTo(player)
      })
    })
  }

  // ── AI trigger ────────────────────────────────────────────

  _triggerAIShot() {
    if (this._getState('right') !== 'holding') return
    if (this.p2.stunned) return

    this.ai.requestShot(this.CANNON, (velocity) => {
      this.b2.launch(velocity, this.levelConfig)
      this._setState('right', 'ball_in_flight')
      this.p2.shootAnimation(new this.THREE.Vector3(velocity.x, velocity.y, 0))
    })
  }

  // ── Update loop ───────────────────────────────────────────

  update(delta) {
    this._tickSide('left')
    this._tickSide('right')
    if (!this._isPVP) this.ai.update(delta)
  }

  _tickSide(side) {
    const ball   = this._ballForSide(side)
    const player = this._playerForSide(side)
    const state  = this._getState(side)

    // Ball landed → go to waiting
    if (state === 'ball_in_flight' && ball.state === 'attached') {
      this._setState(side, 'waiting')
      return
    }

    // Ball returned → go to holding, trigger AI if needed
    if (state === 'ball_returning' && ball.state === 'attached') {
      this._setState(side, 'holding')
      if (!this._isPVP && side === 'right') {
        this._triggerAIShot()
      }
      return
    }

    // Stun entry
    if (player.stunned && state !== 'stunned') {
      this._stunNotified[side] = false
      this._setState(side, 'stunned')
      if (!this._stunNotified[side]) {
        this._stunNotified[side] = true
        if (this._onStun) this._onStun(side)
      }
      return
    }

    // Stun exit
    if (state === 'stunned' && !player.stunned) {
      // After stun: go to waiting so they tap to reposition
      this._setState(side, 'waiting')
      this._stunNotified[side] = false
      // AI re-triggers immediately
      if (!this._isPVP && side === 'right') {
        this._setState(side, 'holding')
        this._triggerAIShot()
      }
      return
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  _clampForSide(side, x) {
    // Full court — no half restriction, players can go anywhere
    return Math.max(-7.5, Math.min(7.5, x))
  }
}
