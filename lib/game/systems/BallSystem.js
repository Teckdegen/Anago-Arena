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
      const hw = GAME_CONFIG.COURT_HALF_WIDTH - 0.3
      if (bx > hw)  { ball.body.position.x = hw;  ball._flyVx = -Math.abs(ball._flyVx || 0) * 0.6 }
      if (bx < -hw) { ball.body.position.x = -hw; ball._flyVx =  Math.abs(ball._flyVx || 0) * 0.6 }
      if (by > 11)  { ball.body.position.y = 11;  ball._flyVy = -Math.abs(ball._flyVy || 0) * 0.5 }

      // ── Hoop scoring ──────────────────────────────────
      const prevY = ball.prevPosition.y
      const result = this.hoop.checkScore(ball.mesh, prevY)
      if (result.scored) {
        this.scoreSystem.addScore(ball.owner, ball.launchPosition, this.hoop.position, this.levelConfig)
        this.hoop.celebrateScore()
        // Re-attach ball to owner so TurnManager resets to idle
        ball.attachTo(ball.owner)
        return
      }

      // ── Stun opponent ─────────────────────────────────
      const opponent = this.balls.find(b => b !== ball)?.owner
      if (opponent && !opponent.stunned) {
        const dist = ball.mesh.position.distanceTo(
          new this.THREE.Vector3(opponent.position.x, opponent.position.y + 0.6, opponent.position.z)
        )
        if (dist < 0.7) {
          opponent.stun()
          if (this._onStun) this._onStun(opponent)
          ball._flyVx = 0; ball._flyVy = 0
          return
        }
      }

      // ── Timeout — ball stops after 6s ─────────────────
      if (ball._flyTimer > 6.0) {
        ball._flyVx = 0; ball._flyVy = 0; ball._flyVz = 0
      }
    })
  }
}
