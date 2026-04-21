import { GAME_CONFIG } from '../config.js'

export class BallSystem {
  constructor(physicsWorld, balls, hoop, scoreSystem, THREE, CANNON) {
    this.world = physicsWorld
    this.balls = balls
    this.hoop = hoop
    this.scoreSystem = scoreSystem
    this.THREE = THREE
    this.CANNON = CANNON
    this._onStun = null
    this.levelConfig = null
  }

  setLevelConfig(cfg) { this.levelConfig = cfg }
  setCourt(court) { this._court = court }
  onStun(cb) { this._onStun = cb }

  update(delta) {
    this.balls.forEach(ball => {
      if (ball.state !== 'flying') {
        ball.update(delta)
        return
      }

      ball.update(delta)

      const bx = ball.body.position.x
      const by = ball.body.position.y

      // ── Hard boundary — ball cannot leave court ────────
      const hw = GAME_CONFIG.COURT_HALF_WIDTH - 0.35
      const r  = GAME_CONFIG.BALL_RADIUS
      if (bx > hw)  { ball.body.position.x = hw;  ball._flyVx = -Math.abs(ball._flyVx || 0) * 0.6 }
      if (bx < -hw) { ball.body.position.x = -hw; ball._flyVx =  Math.abs(ball._flyVx || 0) * 0.6 }
      const ceiling = this._court?.courtHeight || GAME_CONFIG.COURT_HEIGHT || 32
      if (by > ceiling) {
        ball.body.position.y = ceiling
        ball._flyVy = -Math.abs(ball._flyVy || 0) * 0.5
      }
      // ── Centre wall — ball cannot cross the divider ───
      // Ball owner is on left (x<0) or right (x>0) side.
      // If the ball crosses x=0 it bounces back.
      const wt   = GAME_CONFIG.WALL_THICKNESS / 2 + r
      const ownerSide = ball.owner?.side || 'left'
      const wallH = this._court?.centerWallHeight || 3
      if (by < wallH) {
        // Only block while ball is below the wall top
        if (ownerSide === 'left' && bx > -wt) {
          ball.body.position.x = -wt
          ball._flyVx = -Math.abs(ball._flyVx || 0) * 0.55
        } else if (ownerSide === 'right' && bx < wt) {
          ball.body.position.x = wt
          ball._flyVx = Math.abs(ball._flyVx || 0) * 0.55
        }
      }

      // ── Hoop scoring — fall-through animation ─────────
      // ball.update(delta) already called above; just tick the timer
      if (ball._scoringTimer !== undefined) {
        ball._scoringTimer -= delta
        if (ball._scoringTimer <= 0) {
          delete ball._scoringTimer
          ball.attachTo(ball.owner)
        }
        return  // skip all other checks while ball is falling through net
      }

      const prevY = ball.prevPosition.y
      const result = this.hoop.checkScore(ball.mesh, prevY)
      if (result.scored) {
        this.scoreSystem.addScore(ball.owner, ball.launchPosition, this.hoop.position, this.levelConfig)
        this.hoop.celebrateScore()
        // Let ball fall THROUGH the basket visually for 0.45s before re-attaching
        ball._flyVx = 0
        ball._flyVz = 0
        ball._flyVy = -14      // fast downward so it clearly goes through the net
        ball._flyGravity = 0   // no gravity during fall-through (just straight down)
        ball._scoringTimer = 0.45
        return
      }

      // ── Stun opponent — 10s immunity prevents repeat stuns ──
      const opponent = this.balls.find(b => b !== ball)?.owner
      if (opponent && ball.state === 'flying') {
        const dist = ball.mesh.position.distanceTo(
          new this.THREE.Vector3(opponent.position.x, opponent.position.y + 0.6, opponent.position.z)
        )
        if (dist < GAME_CONFIG.BALL_RADIUS * 1.5) {
          if (!opponent.stunned && (opponent.stunImmunity || 0) <= 0) {
            // Fresh hit — stun them
            opponent.stun()
            if (this._onStun) this._onStun(opponent)
            // Ball bounces away from opponent
            const dx = ball.body.position.x - opponent.position.x
            ball._flyVx = Math.sign(dx) * 8
            ball._flyVy = 4
            // Attach ball back to shooter so they can shoot again
            ball.attachTo(ball.owner)
          } else {
            // Immune or already stunned — ball just bounces off
            const dx = ball.body.position.x - opponent.position.x
            ball._flyVx = Math.sign(dx) * 6
            ball._flyVy = Math.abs(ball._flyVy || 0) * 0.5 + 3
          }
          return
        }
      }

      // ── Timeout — re-attach ball after 6s so player can always shoot again ──
      if (ball._flyTimer > 6.0) {
        ball.attachTo(ball.owner)
      }
    })
  }
}
