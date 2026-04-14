import { GAME_CONFIG } from '../config.js'

export class BallSystem {
  constructor(physicsWorld, balls, hoop, scoreSystem, THREE, CANNON) {
    this.world = physicsWorld
    this.balls = balls        // [ball1, ball2]
    this.hoop = hoop
    this.scoreSystem = scoreSystem
    this.THREE = THREE
    this.CANNON = CANNON
    this._onStun = null       // callback(player)
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

      const prevY = ball.prevPosition.y
      ball.update(delta)

      // ── Clamp X within court (wall bounce) ──────────
      const bx = ball.body.position.x
      const hw = GAME_CONFIG.COURT_HALF_WIDTH - 0.3
      if (bx > hw) {
        ball.body.position.x = hw
        ball.body.velocity.x *= -0.7
      } else if (bx < -hw) {
        ball.body.position.x = -hw
        ball.body.velocity.x *= -0.7
      }

      // ── Hoop scoring ─────────────────────────────────
      const result = this.hoop.checkScore(ball.mesh, prevY)
      if (result.scored) {
        this.scoreSystem.addScore(ball.owner, ball.launchPosition, this.hoop.position, this.levelConfig)
        this.hoop.celebrateScore()
        ball.returnTo(ball.owner)
        return
      }

      // ── Player hit (stun) ────────────────────────────
      const opponent = this.balls.find(b => b !== ball)?.owner
      if (opponent && !opponent.stunned) {
        const dist = ball.mesh.position.distanceTo(
          new this.THREE.Vector3(opponent.position.x, opponent.position.y + 0.6, opponent.position.z)
        )
        if (dist < 0.7) {
          opponent.stun()
          if (this._onStun) this._onStun(opponent)
          ball.returnTo(ball.owner)
          return
        }
      }

      // ── Ball timeout ─────────────────────────────────
      if (ball._flyTimer > GAME_CONFIG.BALL_TIMEOUT) {
        ball.returnTo(ball.owner)
      }
    })
  }
}
