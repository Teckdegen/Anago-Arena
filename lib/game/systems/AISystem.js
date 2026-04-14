export class AISystem {
  constructor(aiPlayer, aiBall, humanPlayer, hoop, levelConfig) {
    this.aiPlayer = aiPlayer
    this.aiBall = aiBall
    this.humanPlayer = humanPlayer
    this.hoop = hoop
    this._cfg = levelConfig
    this._decisionTimer = 0
    this._active = false
  }

  setLevelConfig(cfg) { this._cfg = cfg }

  activate() { this._active = true }
  deactivate() { this._active = false }

  // Called by TurnManager when AI should decide and shoot
  requestShot(CANNON, onShot) {
    if (!this._active) return
    const reactionTime = this._cfg.aiReactionTime || 0.8
    this._decisionTimer = reactionTime
    this._pendingShot = { CANNON, onShot }
  }

  update(delta) {
    if (!this._active) return
    if (!this._pendingShot) return

    this._decisionTimer -= delta
    if (this._decisionTimer > 0) return

    // Decide: attack or score
    const action = this._decide()
    const velocity = action === 'attack'
      ? this._calcShotAtPlayer(this._pendingShot.CANNON)
      : this._calcShotToHoop(this._pendingShot.CANNON)

    if (this._pendingShot.onShot) this._pendingShot.onShot(velocity, action)
    this._pendingShot = null
  }

  _decide() {
    const aggression = this._cfg.aiAggression || 0.2
    // Only attack if human isn't already stunned and has the ball ready
    if (
      Math.random() < aggression &&
      !this.humanPlayer.stunned &&
      this.humanPlayer.state === 'holding'
    ) {
      return 'attack'
    }
    return 'score'
  }

  _calcShotToHoop(CANNON) {
    const from = this.aiPlayer.position
    const to = this.hoop.position

    const dx = to.x - from.x
    const dy = to.y - from.y
    const gravity = this._cfg.gravity || 15

    // Choose flight time, add some randomness for imperfection
    const accuracy = this._cfg.aiAccuracy || 0.5
    const baseFlight = 0.85
    const t = baseFlight + (Math.random() - 0.5) * 0.3

    const vx = dx / t
    const vy = dy / t + 0.5 * gravity * t

    // Add error inversely proportional to accuracy
    const error = Math.max(0.1, (1 - accuracy) * 3.5)
    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error * 0.4,
      0
    )
  }

  _calcShotAtPlayer(CANNON) {
    const from = this.aiPlayer.position
    const target = this.humanPlayer.position
    const gravity = this._cfg.gravity || 15

    const dx = target.x - from.x
    const dy = (target.y + 0.6) - from.y
    const t = 0.7 + Math.random() * 0.3

    const vx = dx / t
    const vy = dy / t + 0.5 * gravity * t

    // Attack shots are slightly more accurate
    const error = Math.max(0.05, (1 - this._cfg.aiAccuracy) * 1.5)
    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error,
      0
    )
  }

  // AI picks new reposition spot on its side of the court
  getRepositionTarget(THREE) {
    const aggression = this._cfg.aiAggression || 0.2
    // More aggressive AI moves farther away for bigger points
    const minX = 1.2
    const maxX = 7.0
    const x = minX + (aggression * (maxX - minX)) * (0.4 + Math.random() * 0.6)
    return new THREE.Vector3(x, 0, 0)
  }
}
