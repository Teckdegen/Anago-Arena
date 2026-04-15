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

      const prevY = ball.prevPosition.y
      ball.update(delta)

      const bx = ball.body.position.x
      const by = ball.body.position.y
      const bz = ball.body.position.z

      // ── Wall bounce — ball bounces off walls and stops ──
      const hw = GAME_CONFIG.COURT_HALF_WIDTH - 0.3
      if (bx > hw) {
        ball.body.position.x = hw
        ball.body.velocity.x *= -0.5
      } else if (bx < -hw) {
        ball.body.position.x = -hw
        ball.body.velocity.x *= -0.5
      }

      // ── Z clamp ──────────────────────────────────────
      if (Math.abs(bz) > 1.2) {
        ball.body.position.z = Math.sign(bz) * 1.2
        ball.body.velocity.z *= -0.5
      }

      // ── Ceiling — bounce back down ────────────────────
      if (by > 9.8) {
        ball.body.position.y = 9.8
        ball.body.velocity.y *= -0.5
      }

      // ── Floor — ball stops and sits on floor ──────────
      if (by < 0.3) {
        ball.body.position.y = 0.3
        ball.body.velocity.setZero()
        ball.body.angularVelocity.setZero()
        // Ball is now stationary — player must walk to it
        // Keep state as 'flying' so player can pick it up
      }

      // ── Hoop scoring ──────────────────────────────────
      const result = this.hoop.checkScore(ball.mesh, prevY)
      if (result.scored) {
        this.scoreSystem.addScore(ball.owner, ball.launchPosition, this.hoop.position, this.levelConfig)
        this.hoop.celebrateScore()
        // Ball drops to floor after scoring
        ball.body.velocity.setZero()
        ball.body.position.y = 0.3
        return
      }

      // ── Player pickup — walk into ball to grab it ─────
      for (const otherBall of this.balls) {
        if (otherBall === ball) continue
        const owner = otherBall.owner
        if (!owner) continue
        // Any player can pick up any ball by walking into it
      }

      // Check if either player is touching this ball
      const allPlayers = this.balls.map(b => b.owner).filter(Boolean)
      for (const player of allPlayers) {
        if (ball.state !== 'flying') break
        const dist = ball.mesh.position.distanceTo(
          new this.THREE.Vector3(player.position.x, player.position.y + 0.5, player.position.z)
        )
        if (dist < 0.8) {
          // Player picks up ball
          ball.attachTo(player)
          break
        }
      }

      // ── Stun opponent if ball hits them ───────────────
      const opponent = this.balls.find(b => b !== ball)?.owner
      if (opponent && !opponent.stunned && ball.state === 'flying') {
        const dist = ball.mesh.position.distanceTo(
          new this.THREE.Vector3(opponent.position.x, opponent.position.y + 0.6, opponent.position.z)
        )
        if (dist < 0.7) {
          opponent.stun()
          if (this._onStun) this._onStun(opponent)
          ball.body.velocity.setZero()
          return
        }
      }

      // ── Timeout — ball stops after 6 seconds ─────────
      if (ball._flyTimer > 6.0) {
        ball.body.velocity.setZero()
        ball.body.angularVelocity.setZero()
      }
    })
  }
}
