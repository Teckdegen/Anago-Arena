import { GAME_CONFIG } from '../config.js'

export class ScoreSystem {
  constructor(onScore, onGameEnd) {
    this._onScore = onScore
    this._onGameEnd = onGameEnd
    this.scores = [0, 0]
    this._ended = false
  }

  addScore(player, launchPos, hoopPos, levelConfig) {
    if (this._ended) return 0

    const dx = launchPos.x - hoopPos.x
    const dy = launchPos.y - hoopPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const base = Math.max(10, Math.floor(distance * 10))
    const multiplier = levelConfig?.scoreMultiplier || 1
    const points = Math.floor(base * multiplier)

    const idx = player.side === 'left' ? 0 : 1
    this.scores[idx] += points

    if (this._onScore) {
      this._onScore(idx, points, this.scores[0], this.scores[1])
    }

    if (this.scores[idx] >= GAME_CONFIG.WIN_SCORE) {
      this._ended = true
      if (this._onGameEnd) this._onGameEnd(idx, [...this.scores])
    }

    return points
  }

  // Sync remote score snapshot (PVP — take the higher value for each side)
  reconcile(s0, s1) {
    if (this._ended) return
    this.scores[0] = Math.max(this.scores[0], s0)
    this.scores[1] = Math.max(this.scores[1], s1)
  }

  // Remote player reached 100 first — force game end locally
  forceEnd(winnerIdx, scores) {
    if (this._ended) return
    this._ended = true
    this.scores = scores
    if (this._onGameEnd) this._onGameEnd(winnerIdx, [...scores])
  }

  getScore(idx) { return this.scores[idx] }
  isGameOver() { return this._ended }
  getWinner() {
    if (!this._ended) return -1
    return this.scores[0] >= this.scores[1] ? 0 : 1
  }
  reset() {
    this.scores = [0, 0]
    this._ended = false
  }
}
