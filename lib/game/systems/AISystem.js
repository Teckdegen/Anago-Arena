export class AISystem {
  constructor(aiPlayer, aiBall, humanPlayer, hoop, levelConfig) {
    this.aiPlayer    = aiPlayer
    this.aiBall      = aiBall
    this.humanPlayer = humanPlayer
    this.hoop        = hoop
    this._cfg        = levelConfig
    this._decisionTimer = 0
    this._active     = false
    this._pendingShot = null
    this._shotsMade  = 0   // track consecutive misses for adaptation
    this._lastShotWasScore = false
  }

  setLevelConfig(cfg) { this._cfg = cfg }
  activate()   { this._active = true }
  deactivate() { this._active = false }

  notifyScore()  { this._lastShotWasScore = true;  this._shotsMade++ }
  notifyMiss()   { this._lastShotWasScore = false }

  requestShot(CANNON, onShot) {
    if (!this._active) return
    // Smarter reaction: faster at higher levels, but always feels human
    const base    = this._cfg.aiReactionTime || 0.8
    const jitter  = (Math.random() - 0.5) * 0.25
    this._decisionTimer = Math.max(0.15, base + jitter)
    this._pendingShot   = { CANNON, onShot }
  }

  update(delta) {
    if (!this._active || !this._pendingShot) return
    this._decisionTimer -= delta
    if (this._decisionTimer > 0) return

    const action   = this._decide()
    const velocity = action === 'attack'
      ? this._calcShotAtPlayer(this._pendingShot.CANNON)
      : this._calcShotToHoop(this._pendingShot.CANNON)

    this._pendingShot.onShot(velocity, action)
    this._pendingShot = null
  }

  _decide() {
    const aggression = this._cfg.aiAggression || 0.2
    const humanReady = this.humanPlayer.state === 'holding' || this.humanPlayer.state === 'waiting'

    // Attack more if human is close to winning (score pressure)
    const humanScore = window.BB_GAME_UI?._scores?.[0] || 0
    const aiScore    = window.BB_GAME_UI?._scores?.[1] || 0
    const pressureBonus = humanScore > aiScore + 20 ? 0.15 : 0

    if (
      Math.random() < (aggression + pressureBonus) &&
      !this.humanPlayer.stunned &&
      humanReady
    ) {
      return 'attack'
    }
    return 'score'
  }

  _calcShotToHoop(CANNON) {
    const from    = this.aiPlayer.position
    const to      = this.hoop.position
    const gravity = this._cfg.gravity || 15
    const accuracy = this._cfg.aiAccuracy || 0.5

    const dx = to.x - from.x
    const dy = to.y - from.y

    // Smart flight time: solve for optimal arc
    // Use multiple candidate times and pick the one closest to a clean arc
    const bestT = this._findBestFlightTime(dx, dy, gravity)

    const vx = dx / bestT
    const vy = dy / bestT + 0.5 * gravity * bestT

    // Error scales with distance and inversely with accuracy
    const dist  = Math.sqrt(dx * dx + dy * dy)
    const error = Math.max(0.05, (1 - accuracy) * 2.0 * (1 + dist * 0.05))

    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error * 0.3,
      0
    )
  }

  // Find flight time that produces a nice arc (not too flat, not too steep)
  _findBestFlightTime(dx, dy, gravity) {
    // Try several flight times and score them
    const candidates = [0.55, 0.65, 0.75, 0.85, 0.95, 1.05, 1.15]
    let bestT     = 0.75
    let bestScore = -Infinity

    for (const t of candidates) {
      const vy = dy / t + 0.5 * gravity * t
      const vx = dx / t
      const speed = Math.sqrt(vx * vx + vy * vy)
      // Prefer arcs where vy is positive (going up) and speed is reasonable
      const arcScore = vy > 0 ? (1 / (1 + Math.abs(speed - 12))) : -10
      if (arcScore > bestScore) {
        bestScore = arcScore
        bestT     = t
      }
    }
    return bestT
  }

  _calcShotAtPlayer(CANNON) {
    const from    = this.aiPlayer.position
    const target  = this.humanPlayer.position
    const gravity = this._cfg.gravity || 15

    const dx = target.x - from.x
    const dy = (target.y + 0.7) - from.y
    const t  = 0.55 + Math.random() * 0.25

    const vx = dx / t
    const vy = dy / t + 0.5 * gravity * t

    // Attack shots are precise — small error
    const error = Math.max(0.04, (1 - this._cfg.aiAccuracy) * 1.0)
    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error * 0.5,
      0
    )
  }

  // AI repositions strategically — farther = more points, but also considers blocking
  getRepositionTarget(THREE) {
    const aggression = this._cfg.aiAggression || 0.2
    const accuracy   = this._cfg.aiAccuracy   || 0.5

    // High accuracy AI: position at optimal scoring distance
    // Low accuracy AI: stays closer (easier shots)
    const optimalDist = 2.5 + accuracy * 4.5   // 2.5 to 7.0
    const spread      = 1.5

    // Occasionally try to position near human to block
    const shouldBlock = aggression > 0.5 && Math.random() < aggression * 0.3
    if (shouldBlock) {
      const humanX = this.humanPlayer.position.x
      // Move to intercept — stay on right side
      const blockX = Math.max(0.5, Math.min(7.5, humanX + 1.5))
      return new THREE.Vector3(blockX, 0, 0)
    }

    const x = Math.max(0.5, Math.min(7.5,
      optimalDist + (Math.random() - 0.5) * spread
    ))
    return new THREE.Vector3(x, 0, 0)
  }
}
