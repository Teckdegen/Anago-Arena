import { GAME_CONFIG } from '../config.js'

/*
  NEW CONTROL FLOW:
  ─────────────────
  ANY tap on screen → player jumps to that world X position (even mid-air)
  Ball always follows player (returns to hand) unless it's flying toward hoop
  
  Drag near player → aim arrow shows curved arc
  Release → ball launches along that arc
  
  If player taps while ball is in flight → player jumps to tap position
  Ball curves back to player's new position
  Player can shoot again from mid-air
  
  If player doesn't shoot after jumping → falls back to ground slowly
*/

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

    // State per side — simplified
    // 'idle' = has ball, can drag to shoot OR tap to jump
    // 'dragging' = currently aiming
    // 'shot_in_flight' = ball flying toward hoop (scored/missed)
    // 'stunned'
    this._state = { left: 'idle', right: 'idle' }

    this._drag      = { left: false, right: false }
    this._dragStart = { left: null,  right: null  }

    this._stunNotified = { left: false, right: false }
  }

  _getState(side)        { return this._state[side] }
  _setState(side, value) {
    this._state[side] = value
    const player = side === 'left' ? this.p1 : this.p2
    player.state = value
  }

  _playerForSide(side) { return side === 'left' ? this.p1 : this.p2 }
  _ballForSide(side)   { return side === 'left' ? this.b1 : this.b2 }

  // ── Start ─────────────────────────────────────────

  start() {
    this._setState('left',  'idle')
    this._setState('right', 'idle')
    this.b1.attachTo(this.p1)
    this.b2.attachTo(this.p2)

    if (this._isPVP) {
      this._startPVP()
    } else {
      this._startAI()
      this._triggerAIShot()
    }
  }

  // ── AI mode ───────────────────────────────────────

  _startAI() {
    this.ai.activate()
    this._bindInput('left')
  }

  // ── PVP mode ──────────────────────────────────────

  _startPVP() {
    this._bindInput(this.localSide)
    const remote = this.pvpSync.remoteSide

    this.pvpSync
      .on('onRemoteShot', ({ vx, vy }) => {
        const player = this._playerForSide(remote)
        const ball   = this._ballForSide(remote)
        if (player.stunned) return
        // Detach ball from player, launch it
        ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
        this._setState(remote, 'shot_in_flight')
        player.shootAnimation()
      })
      .on('onRemoteMove', ({ targetX }) => {
        const player = this._playerForSide(remote)
        player.jumpTo(new this.THREE.Vector3(targetX, 0, 0))
      })
      .on('onRemoteStun', ({ side }) => {
        this._playerForSide(side).stun()
        if (this._onStun) this._onStun(side)
        window.BB_GAME_UI?.showStun(side)
      })
      .on('onRemoteScore', ({ s0, s1 }) => {
        this.scoreSystem.reconcile(s0, s1)
        window.BB_GAME_UI?.updateScore(s0, s1)
      })
      .on('onRemoteGameEnd', ({ winnerSide, s0, s1 }) => {
        this.scoreSystem.forceEnd(winnerSide === 'left' ? 0 : 1, [s0, s1])
      })
  }

  // ── Input binding ─────────────────────────────────

  _bindInput(side) {
    const isPVP = this._isPVP

    // ── POINTER DOWN: start drag if near ball ────────
    this.input.onPointerDown((worldPos) => {
      const state  = this._getState(side)
      if (state === 'stunned') return
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      // Only start drag if ball is attached and touch is near player/ball
      if (ball.state === 'attached') {
        const dist = worldPos.distanceTo(player.position)
        if (dist < 2.5) {
          this._drag[side]      = true
          this._dragStart[side] = worldPos.clone()
          this._setState(side, 'dragging')
        }
      }
    })

    // ── POINTER MOVE: update aim arrow ───────────────
    this.input.onPointerMove((worldPos) => {
      if (!this._drag[side]) return
      this.dragArrow.update(this._dragStart[side], worldPos, this.levelConfig.gravity)
    })

    // ── POINTER UP: shoot ────────────────────────────
    this.input.onPointerUp((worldPos) => {
      if (!this._drag[side]) return
      this._drag[side] = false
      this.dragArrow.hide()

      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)

      // Only shoot if ball is still attached
      if (ball.state !== 'attached') return

      const start = this._dragStart[side]
      const dx    = start.x - worldPos.x
      const dy    = start.y - worldPos.y
      const raw   = Math.sqrt(dx * dx + dy * dy)
      const power = Math.max(GAME_CONFIG.DRAG_MIN_POWER, Math.min(GAME_CONFIG.DRAG_MAX_POWER, raw * 2.2))

      const vx = dx * 0.5 * power
      const vy = Math.abs(dy) * 0.5 * power + power * 0.45

      ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
      this._setState(side, 'shot_in_flight')
      player.shootAnimation()

      if (isPVP) this.pvpSync.broadcastShot(vx, vy)
    })

    // ── TAP: jump to position (works ANY time except stunned) ──
    this.input.onTap((worldPos) => {
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      const targetX = Math.max(-7.5, Math.min(7.5, worldPos.x))
      const target  = new this.THREE.Vector3(targetX, 0, 0)

      // Jump player to tap position
      player.jumpTo(target)

      // If ball is not flying toward hoop, recall it to new position
      if (ball.state !== 'flying' || this._getState(side) !== 'shot_in_flight') {
        ball.returnTo(player)
        // Reset to idle so player can shoot from new position
        if (this._getState(side) !== 'shot_in_flight') {
          this._setState(side, 'idle')
        }
      }

      if (isPVP) this.pvpSync.broadcastMove(targetX)
    })
  }

  // ── AI trigger ────────────────────────────────────

  _triggerAIShot() {
    if (this._getState('right') !== 'idle') return
    if (this.p2.stunned) return

    this.ai.requestShot(this.CANNON, (velocity) => {
      this.b2.launch(velocity, this.levelConfig)
      this._setState('right', 'shot_in_flight')
      this.p2.shootAnimation()
    })
  }

  // ── Update loop ───────────────────────────────────

  update(delta) {
    this._tickSide('left',  delta)
    this._tickSide('right', delta)
    if (!this._isPVP) this.ai.update(delta)
  }

  _tickSide(side, delta) {
    const ball   = this._ballForSide(side)
    const player = this._playerForSide(side)
    const state  = this._getState(side)

    // Shot resolved (scored or timed out) → back to idle
    if (state === 'shot_in_flight' && ball.state === 'attached') {
      this._setState(side, 'idle')
      if (!this._isPVP && side === 'right') {
        // AI repositions then shoots again
        const target = this.ai.getRepositionTarget(this.THREE)
        player.jumpTo(target)
        setTimeout(() => this._triggerAIShot(), 600)
      }
      return
    }

    // Ball returned after tap-recall → idle
    if (state !== 'shot_in_flight' && ball.state === 'attached' && state !== 'idle' && state !== 'dragging') {
      this._setState(side, 'idle')
      return
    }

    // Stun entry
    if (player.stunned && state !== 'stunned') {
      this._drag[side] = false
      this.dragArrow.hide()
      this._setState(side, 'stunned')
      if (!this._stunNotified[side]) {
        this._stunNotified[side] = true
        if (this._onStun) this._onStun(side)
      }
      return
    }

    // Stun exit
    if (state === 'stunned' && !player.stunned) {
      this._setState(side, 'idle')
      this._stunNotified[side] = false
      if (!this._isPVP && side === 'right') {
        this._triggerAIShot()
      }
    }
  }
}
