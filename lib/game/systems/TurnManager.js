import { GAME_CONFIG } from '../config.js'

/*
  CONTROL RULES:
  ──────────────
  1. Drag near player → straight arrow shows in drag direction
  2. Release → ball shoots STRAIGHT in that direction (no arc, no gravity on ball)
     Longer drag = more speed
  3. Tap anywhere → player teleports at super speed to that spot
     Even if ball is in the air — you go TO the ball
  4. Ball NEVER auto-returns — you must tap to go get it
  5. Only gravity = player falls down when in air (floaty)
  6. Ball has no gravity — flies straight until it hits something or scores
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

    this._state     = { left: 'idle', right: 'idle' }
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
        ball.launchStraight(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
        this._setState(remote, 'shot_in_flight')
        player.shootAnimation()
      })
      .on('onRemoteMove', ({ targetX, targetY }) => {
        const player = this._playerForSide(remote)
        player.teleportTo(new this.THREE.Vector3(targetX, targetY || 0, 0))
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

    // POINTER DOWN — start drag if near player
    // POINTER DOWN — start drag from ANYWHERE on screen
    this.input.onPointerDown((worldPos) => {
      if (this._getState(side) === 'stunned') return
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return
      // Only drag if ball is attached — no proximity check, anywhere on screen
      if (ball.state === 'attached') {
        this._drag[side]      = true
        this._dragStart[side] = worldPos.clone()  // store where finger went down
        this._setState(side, 'dragging')
      }
    })

    // POINTER MOVE — arrow always starts from BALL position, points toward drag
    this.input.onPointerMove((worldPos) => {
      if (!this._drag[side]) return
      const ball = this._ballForSide(side)
      // Arrow origin = ball's current world position (not touch start)
      const ballPos = ball.mesh.position.clone()
      this.dragArrow.update(ballPos, worldPos)
    })

    // POINTER UP — shoot from ball position toward drag direction, FAST
    this.input.onPointerUp((worldPos) => {
      if (!this._drag[side]) return
      this._drag[side] = false
      this.dragArrow.hide()

      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (ball.state !== 'attached') return

      // Direction: from ball position toward where finger is now
      const ballPos = ball.mesh.position
      const dx = worldPos.x - ballPos.x
      const dy = worldPos.y - ballPos.y
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len < 0.05) {
        this._setState(side, 'idle')
        return
      }

      // FAST speed — minimum 8, max 28, scales with drag distance
      const speed = Math.max(8, Math.min(28, len * 4.0))
      const vx = (dx / len) * speed
      const vy = (dy / len) * speed

      ball.launchStraight(new this.CANNON.Vec3(vx, vy, 0), this.levelConfig)
      this._setState(side, 'shot_in_flight')
      player.shootAnimation()

      if (isPVP) this.pvpSync.broadcastShot(vx, vy)
    })

    // TAP — player teleports at 8x speed TO THE BALL's current position
    // Once there, ball attaches and player can shoot
    // If player doesn't shoot, ball slowly falls downward
    this.input.onTap((worldPos) => {
      const player = this._playerForSide(side)
      const ball   = this._ballForSide(side)
      if (player.stunned) return

      // Always go to ball's current world position
      const bx = ball.mesh.position.x
      const by = Math.max(0, ball.mesh.position.y)

      // Teleport player to ball position
      player.teleportTo(new this.THREE.Vector3(bx, by, 0))

      // Attach ball when player arrives
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
      // AI also shoots straight
      this.b2.launchStraight(velocity, this.levelConfig)
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

    // Ball scored/timed out → idle (player must go get next ball)
    if (state === 'shot_in_flight' && ball.state === 'attached') {
      this._setState(side, 'idle')
      if (!this._isPVP && side === 'right') {
        const target = this.ai.getRepositionTarget(this.THREE)
        player.teleportTo(target)
        setTimeout(() => this._triggerAIShot(), 500)
      }
      return
    }

    // Check if player walked into ball (auto-pickup)
    if (state === 'idle' && ball.state !== 'attached' && ball.state !== 'flying') {
      const d = player.position.distanceTo(ball.mesh.position)
      if (d < 1.2) {
        ball.attachTo(player)
      }
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
