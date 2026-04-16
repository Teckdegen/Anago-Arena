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

    // States: 'idle' | 'dragging' | 'shot_in_flight' | 'stunned'
    this._state = { left: 'idle', right: 'idle' }
    this._drag  = { left: false,  right: false  }
    this._stunNotified = { left: false, right: false }
  }

  _getState(s)        { return this._state[s] }
  _setState(s, value) { this._state[s] = value; this._playerForSide(s).state = value }
  _playerForSide(s)   { return s === 'left' ? this.p1 : this.p2 }
  _ballForSide(s)     { return s === 'left' ? this.b1 : this.b2 }

  start() {
    this._setState('left',  'idle')
    this._setState('right', 'idle')
    this.b1.attachTo(this.p1)
    this.b2.attachTo(this.p2)
    if (this._isPVP) {
      this._startPVP()
    } else {
      this.ai.activate()
      this._bindInput('left')
      this._triggerAIShot()
    }
  }

  _startPVP() {
    this._bindInput(this.localSide)
    const remote = this.pvpSync.remoteSide
    this.pvpSync
      .on('onRemoteShot', ({ vx, vy }) => {
        const player = this._playerForSide(remote)
        const ball   = this._ballForSide(remote)
        if (player.stunned) return
        ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
        this._setState(remote, 'shot_in_flight')
        player.shootAnimation()
      })
      .on('onRemoteMove', ({ bx, by }) => {
        const player = this._playerForSide(remote)
        const ball   = this._ballForSide(remote)
        player.teleportTo(new this.THREE.Vector3(bx, by, 0))
        player._onTeleportComplete = () => {
          ball.attachTo(player)
          this._setState(remote, 'idle')
        }
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

  _bindInput(side) {
    const isPVP = this._isPVP

    // ── POINTER DOWN: start drag from ANYWHERE — ball must be attached ──
    this.input.onPointerDown((worldPos) => {
      if (this._getState(side) === 'stunned') return
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return
      if (ball.state === 'attached') {
        this._drag[side] = true
        this._setState(side, 'dragging')
      }
    })

    // ── POINTER MOVE: arrow from ball to finger ──
    this.input.onPointerMove((worldPos) => {
      if (!this._drag[side]) return
      const ball = this._ballForSide(side)
      this.dragArrow.update(ball.mesh.position.clone(), worldPos)
    })

    // ── POINTER UP: shoot — fires on ANY release ──
    this.input.onPointerUp((worldPos) => {
      if (!this._drag[side]) return
      this._drag[side] = false
      this.dragArrow.hide()

      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (ball.state !== 'attached') { this._setState(side, 'idle'); return }

      const ballPos = ball.mesh.position
      const dx = worldPos.x - ballPos.x
      const dy = worldPos.y - ballPos.y
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len < 0.02) { this._setState(side, 'idle'); return }

      // Fast shot — min 18, max 45, very responsive
      const speed = Math.max(18, Math.min(45, len * 8.0))
      const vx = (dx / len) * speed
      const vy = (dy / len) * speed

      ball.launch(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
      this._setState(side, 'shot_in_flight')
      player.shootAnimation()

      if (isPVP) this.pvpSync.broadcastShot(vx, vy)
    })

    // ── TAP: teleport player to ball's current position ──
    this.input.onTap((worldPos) => {
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      const bx = ball.mesh.position.x
      const by = Math.max(0, ball.mesh.position.y)

      player.teleportTo(new this.THREE.Vector3(bx, by, 0))
      player._onTeleportComplete = () => {
        ball.attachTo(player)
        this._setState(side, 'idle')
      }

      if (isPVP) this.pvpSync.broadcastMove(bx, by)
    })
  }

  _triggerAIShot() {
    if (this._getState('right') !== 'idle') return
    if (this.p2.stunned) return
    this.ai.requestShot(this.CANNON, (velocity) => {
      this.b2.launch(velocity, this.levelConfig)
      this._setState('right', 'shot_in_flight')
      this.p2.shootAnimation()
    })
  }

  update(delta) {
    this._tickSide('left',  delta)
    this._tickSide('right', delta)
    if (!this._isPVP) this.ai.update(delta)
  }

  _tickSide(side, delta) {
    const ball   = this._ballForSide(side)
    const player = this._playerForSide(side)
    const state  = this._getState(side)

    // After scoring — ball gets re-attached by ScoreSystem, reset to idle
    if (state === 'shot_in_flight' && ball.state === 'attached') {
      this._setState(side, 'idle')
      if (!this._isPVP && side === 'right') {
        const target = this.ai.getRepositionTarget(this.THREE)
        player.teleportTo(target)
        player._onTeleportComplete = () => {
          this.b2.attachTo(player)
          setTimeout(() => this._triggerAIShot(), 300)
        }
      }
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
      if (!this._isPVP && side === 'right') this._triggerAIShot()
    }
  }
}
