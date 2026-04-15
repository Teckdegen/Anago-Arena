export class PlayerSystem {
  constructor(players) {
    this.players = players
  }

  // Legacy — kept for PVP remote player moves
  startReposition(player, targetWorldPos, onComplete) {
    player.moveTo(targetWorldPos, onComplete)
  }

  update(delta) {
    this.players.forEach(p => p.update(delta))
  }
}
