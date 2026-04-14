import { GAME_CONFIG } from '../config.js'

/*
  Player states:
    holding        — ball in hand, can drag
    dragging       — human dragging ball (AI/remote never enters this)
    ball_in_flight — ball launched
    waiting        — ball resolved, tap to reposition
    repositioning  — moving to new spot
    ball_returning — ball flying back
    stunned        — frozen

  In PVP mode (`pvpSync` provided):
    - localSide determines which player this client controls (left|right)
    - Remote player actions come in via pvpSync callbacks
    - AI is disabled entirely
*/

export class TurnManager {
  constructor({
    player1, player2, ball1, ball2, hoop,
    inputSystem, playerSystem, ballSystem, aiSystem,
    dragArrow, scoreSystem, levelConfig,
    onStun, THREE, CANNON,
    // PVP-only (optional)
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

    // PVP
    this.pvpSync   = pvpSync   || null
    this.localSide = localSide || 'left'  // 'left' | 'right'
    this._isPVP    = !!pvpSync

    // Derive local/remote player + ball refs
    if (this._isPVP && this.localSide === 'right') {
      this._local  = { player: player2, ball: ball2, state: 'holding' }
      this._remote = { player: player1, ball: ball1, state: 'holding' }
    } else {
      this._local  = { player: player1, ball: ball1, state: 'holding' }
      this._remote = { player: player2, ball: ball2, state: 'holding' }
    }

    // Classic AI mode still uses named state vars
    this._p1State = 'holding'
    this._p2State = 'holding'

    this._dragging       = false
    this._dragStartWorld = null
    this._stunNotified   = { p1: false, p2: false }
  }

  // ── Start ─────────────────────────────────────────────────

  start() {
    this.p1.state = 'holding'
    this.p2.state = 'holding'
    this._p1State = 'holding'
    this._p2State = 'holding'
    this.b1.attachTo(this.p1)
    this.b2.attachTo(this.p2)

    if (this._isPVP) {
      this._startPVP()
    } else {
      this._startAI()
    }
  }

  // ── AI mode setup ─────────────────────────────────────────

  _startAI() {
    this.ai.activate()
    this._bindLocalInput(this.p1, this.b1, 'p1', 'left', 'right')
    this._triggerAIShot()
  }

  // ── PVP mode setup ────────────────────────────────────────

  _startPVP() {
    const loc = this._local
    const rem = this._remote

    // Bind input to local player
    this._bindLocalInput(
      loc.player, loc.ball,
      this.localSide === 'left' ? 'p1' : 'p2',
      this.localSide,
      this.localSide === 'left' ? 'right' : 'left',
      /* isPVP */ true
    )

    // Listen for remote actions
    this.pvpSync
      .on('onRemoteShot', ({ vx, vy }) => {
        if (rem.state !== 'holding' || rem.player.stunned) return
        const vel = new this.CANNON.Vec3(vx, vy, 0)
        rem.ball.launch(vel, this.levelConfig)
        rem.state = 'ball_in_flight'
        rem.player.state = 'ball_in_flight'
        rem.player.shootAnimation(new this.THREE.Vector3(vx, vy, 0))
        // Sync state var
        this._setSideState(this.pvpSync.remoteSide, 'ball_in_flight')
      })
      .on('onRemoteMove', ({ targetX }) => {
        if (rem.state !== 'waiting') return
        const clampedX = this._clampForSide(this.pvpSync.remoteSide, targetX)
        const target   = new this.THREE.Vector3(clampedX, 0, 0)
        rem.state = 'repositioning'
        rem.player.state = 'repositioning'
        this._setSideState(this.pvpSync.remoteSide, 'repositioning')
        this.playerSystem.startReposition(rem.player, target, () => {
          rem.state = 'ball_returning'
          rem.player.state = 'ball_returning'
          this._setSideState(this.pvpSync.remoteSide, 'ball_returning')
          rem.ball.returnTo(rem.player)
        })
      })
      .on('onRemoteStun', ({ side }) => {
        const target = side === 'left' ? this.p1 : this.p2
        target.stun()
        if (this._onStun) this._onStun(side)
        window.BB_GAME_UI?.showStun(side)
      })
      .on('onRemoteScore', ({ s0, s1 }) => {
        // Let scoreSystem reconcile with remote
        this.scoreSystem.reconcile(s0, s1)
        window.BB_GAME_UI?.updateScore(s0, s1)
      })
      .on('onRemoteGameEnd', ({ winnerSide, s0, s1 }) => {
        const winnerIdx = winnerSide === 'left' ? 0 : 1
        this.scoreSystem.forceEnd(winnerIdx, [s0, s1])
      })
  }

  // ── Shared local input binding ────────────────────────────

  /**
   * @param {Player} player    — the local player object
   * @param {Ball}   ball      — the local ball
   * @param {'p1'|'p2'} stateKey — which _p1/_p2 state var to use
   * @param {'left'|'right'} side   — court side for tap clamping
   * @param {'left'|'right'} oppSide — opponent side (for stun broadcast)
   * @param {boolean} isPVP    — broadcast actions when true
   */
  _bindLocalInput(player, ball, stateKey, side, oppSide, isPVP = false) {
    const getState  = ()    => this[`_${stateKey}State`]
    const setState  = (v)   => { this[`_${stateKey}State`] = v }

    this.input.onPointerDown((worldPos) => {
      if (getState() !== 'holding') return
      if (player.stunned) return

      const dist = worldPos.distanceTo(ball.mesh.position)
      if (dist < 1.4) {
        this._dragging       = true
        this._dragStartWorld = worldPos.clone()
        setState('dragging')
        player.state = 'dragging'
      }
    })

    this.input.onPointerMove((worldPos) => {
      if (!this._dragging) return
      this.dragArrow.update(this._dragStartWorld, worldPos, this.levelConfig.gravity)
    })

    this.input.onPointerUp((worldPos, screen, wasDrag) => {
      if (!this._dragging) return
      this._dragging = false
      this.dragArrow.hide()

      const start    = this._dragStartWorld
      const dx       = start.x - worldPos.x
      const dy       = start.y - worldPos.y
      const rawPower = Math.sqrt(dx * dx + dy * dy)
      const power    = Math.max(GAME_CONFIG.DRAG_MIN_POWER, Math.min(GAME_CONFIG.DRAG_MAX_POWER, rawPower * 2.2))

      const vx = dx * 0.5 * power
      const vy = Math.abs(dy) * 0.5 * power + power * 0.45

      const velocity = new this.CANNON.Vec3(vx, vy, 0)
      ball.launch(velocity, this.levelConfig)
      setState('ball_in_flight')
      player.state = 'ball_in_flight'
      player.shootAnimation(new this.THREE.Vector3(dx, dy, 0))

      if (isPVP) this.pvpSync.broadcastShot(vx, vy)
    })

    this.input.onTap((worldPos) => {
      if (getState() !== 'waiting') return
      if (player.stunned) return

      const targetX  = this._clampForSide(side, worldPos.x)
      const target   = new this.THREE.Vector3(targetX, 0, 0)

      setState('repositioning')
      player.state = 'repositioning'
      if (isPVP) this.pvpSync.broadcastMove(targetX)

      this.playerSystem.startReposition(player, target, () => {
        setState('ball_returning')
        player.state = 'ball_returning'
        ball.returnTo(player)
      })
    })
  }

  // ── AI trigger ────────────────────────────────────────────

  _triggerAIShot() {
    if (this._p2State !== 'holding') return
    if (this.p2.stunned) return

    this.ai.requestShot(this.CANNON, (velocity) => {
      this.b2.launch(velocity, this.levelConfig)
      this._p2State = 'ball_in_flight'
      this.p2.state = 'ball_in_flight'
      this.p2.shootAnimation(new this.THREE.Vector3(velocity.x, velocity.y, 0))
    })
  }

  // ── Update loop ───────────────────────────────────────────

  update(delta) {
    if (this._isPVP) {
      this._updatePVPSide(this._local, this.pvpSync.localSide)
      this._updatePVPSide(this._remote, this.pvpSync.remoteSide)
    } else {
      this._updateP1(delta)
      this._updateP2(delta)
    }

    if (!this._isPVP) this.ai.update(delta)
  }

  _updatePVPSide(ref, side) {
    const stateKey = side === 'left' ? '_p1State' : '_p2State'

    if (this[stateKey] === 'ball_in_flight' && ref.ball.state === 'attached') {
      this[stateKey] = 'waiting'
      ref.state      = 'waiting'
      ref.player.state = 'waiting'
    }

    if (this[stateKey] === 'ball_returning' && ref.ball.state === 'attached') {
      this[stateKey] = 'holding'
      ref.state      = 'holding'
      ref.player.state = 'holding'
    }

    // Stun entry
    if (ref.player.stunned && this[stateKey] !== 'stunned') {
      this[stateKey] = 'stunned'
      ref.state      = 'stunned'
    }

    // Stun exit
    if (this[stateKey] === 'stunned' && !ref.player.stunned) {
      this[stateKey] = 'waiting'
      ref.state      = 'waiting'
      ref.player.state = 'waiting'
    }
  }

  _updateP1(delta) {
    if (this._p1State === 'ball_in_flight' && this.b1.state === 'attached') {
      this._p1State  = 'waiting'
      this.p1.state  = 'waiting'
    }

    if (this._p1State === 'ball_returning' && this.b1.state === 'attached') {
      this._p1State  = 'holding'
      this.p1.state  = 'holding'
    }

    if (this.p1.stunned && this._p1State !== 'stunned') {
      this._p1State = 'stunned'
      if (!this._stunNotified.p1) {
        this._stunNotified.p1 = true
        if (this._onStun) this._onStun('left')
      }
    }

    if (this._p1State === 'stunned' && !this.p1.stunned) {
      this._p1State  = 'waiting'
      this.p1.state  = 'waiting'
      this._stunNotified.p1 = false
    }
  }

  _updateP2(delta) {
    if (this._p2State === 'ball_in_flight' && this.b2.state === 'attached') {
      const newPos = this.ai.getRepositionTarget(this.THREE)
      this._p2State  = 'repositioning'
      this.p2.state  = 'repositioning'
      this.playerSystem.startReposition(this.p2, newPos, () => {
        this._p2State  = 'ball_returning'
        this.p2.state  = 'ball_returning'
        this.b2.returnTo(this.p2)
      })
    }

    if (this._p2State === 'ball_returning' && this.b2.state === 'attached') {
      this._p2State  = 'holding'
      this.p2.state  = 'holding'
      this._triggerAIShot()
    }

    if (this.p2.stunned && this._p2State !== 'stunned') {
      this._p2State = 'stunned'
      if (!this._stunNotified.p2) {
        this._stunNotified.p2 = true
        if (this._onStun) this._onStun('right')
      }
    }

    if (this._p2State === 'stunned' && !this.p2.stunned) {
      this._p2State  = 'holding'
      this.p2.state  = 'holding'
      this._stunNotified.p2 = false
      this._triggerAIShot()
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  _clampForSide(side, x) {
    // Left player stays on left half, right player on right half
    return side === 'left'
      ? Math.max(-7.5, Math.min(-0.4, x))
      : Math.max(0.4,  Math.min(7.5,  x))
  }

  _setSideState(side, value) {
    if (side === 'left') {
      this._p1State = value
      this._local.state = value
    } else {
      this._p2State = value
      this._remote.state = value
    }
  }
}
