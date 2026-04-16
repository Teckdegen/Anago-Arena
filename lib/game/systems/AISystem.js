export class AISystem {
  constructor(aiPlayer, aiBall, humanPlayer, hoop, levelConfig) {
    this.aiPlayer    = aiPlayer
    this.aiBall      = aiBall
    this.humanPlayer = humanPlayer
    this.hoop        = hoop
    this._cfg        = levelConfig
    this._active     = false
    this._pendingShot = null
    this._decisionTimer = 0

    // Self-triggering shot timer — AI never waits more than MAX_IDLE seconds
    this._idleTimer  = 0
    this._MAX_IDLE   = 1.8   // shoot at least every 1.8s
  }

  setLevelConfig(cfg) { this._cfg = cfg }
  activate()   { this._active = true; this._idleTimer = 0.5 }
  deactivate() { this._active = false }

  requestShot(CANNON, onShot) {
    if (!this._active) return
    // Instant reaction — no delay
    const jitter = Math.random() * 0.15
    this._decisionTimer = jitter
    this._pendingShot   = { CANNON, onShot }
    this._idleTimer     = 0
  }

  update(delta) {
    if (!this._active) return

    // Self-trigger: if AI has been idle too long, force a shot request
    // This is called by TurnManager._tickSide when state is idle
    this._idleTimer += delta

    if (this._pendingShot) {
      this._decisionTimer -= delta
      if (this._decisionTimer > 0) return

      const action   = this._decide()
      const velocity = action === 'attack'
        ? this._calcShotAtPlayer(this._pendingShot.CANNON)
        : this._calcShotToHoop(this._pendingShot.CANNON)

      this._pendingShot.onShot(velocity, action)
      this._pendingShot = null
      this._idleTimer   = 0
    }
  }

  // Called by TurnManager every tick when AI is idle — forces shot if too long
  shouldForceShot() {
    return this._active && !this._pendingShot && this._idleTimer > this._MAX_IDLE
  }

  _decide() {
    const aggression = Math.min(0.95, (this._cfg.aiAggression || 0.3) + 0.25)
    const humanReady = this.humanPlayer.state === 'holding' ||
                       this.humanPlayer.state === 'waiting' ||
                       this.humanPlayer.state === 'idle'

    if (
      Math.random() < aggression &&
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
    const accuracy = Math.min(0.98, 0.90 + (this._cfg.level || 1) * 0.003)

    const dx = to.x - from.x
    const dy = to.y - from.y
    const bestT = this._findBestFlightTime(dx, dy, gravity)

    const vx = dx / bestT
    const vy = dy / bestT + 0.5 * gravity * bestT

    const error = Math.max(0.01, (1 - accuracy) * 0.5)
    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error * 0.2,
      0
    )
  }

  _findBestFlightTime(dx, dy, gravity) {
    // Longer flight times needed for taller court
    const candidates = [0.6, 0.75, 0.9, 1.05, 1.2, 1.4, 1.6, 1.8]
    let bestT     = 0.9
    let bestScore = -Infinity

    for (const t of candidates) {
      const vy = dy / t + 0.5 * gravity * t
      const vx = dx / t
      const speed = Math.sqrt(vx * vx + vy * vy)
      const arcScore = vy > 0 ? (1 / (1 + Math.abs(speed - 18))) : -10
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
    const dy = (target.y + 1.5) - from.y
    const t  = 0.6 + Math.random() * 0.3

    const vx = dx / t
    const vy = dy / t + 0.5 * gravity * t

    const error = Math.max(0.02, (1 - this._cfg.aiAccuracy) * 0.6)
    return new CANNON.Vec3(
      vx + (Math.random() - 0.5) * error,
      vy + (Math.random() - 0.5) * error * 0.3,
      0
    )
  }

  getRepositionTarget(THREE) {
    const accuracy = this._cfg.aiAccuracy || 0.5
    const optimalDist = 1.5 + accuracy * 5.0
    const spread      = 3.0
    const x = Math.max(0.8, Math.min(11.0,
      optimalDist + (Math.random() - 0.5) * spread
    ))
    return new THREE.Vector3(x, 0, 0)
  }
}
