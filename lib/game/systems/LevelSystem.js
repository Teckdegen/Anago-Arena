import { getLevelConfig } from '../config.js'

export class LevelSystem {
  constructor(initialConfig) {
    this._config = initialConfig
  }

  get currentConfig() { return this._config }

  nextLevel() {
    this._config = getLevelConfig(this._config.level + 1)
    return this._config
  }

  getConfig(level) { return getLevelConfig(level) }
}
