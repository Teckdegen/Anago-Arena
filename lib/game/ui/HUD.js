export class HUD {
  showScorePopup(points, worldPosition, camera, renderer) {
    if (!window.BB_GAME_UI?.showScore) return
    if (!worldPosition || !camera || !renderer) return

    const vec = worldPosition.clone()
    vec.project(camera)
    const x = (vec.x * 0.5 + 0.5) * renderer.domElement.clientWidth
    const y = (-vec.y * 0.5 + 0.5) * renderer.domElement.clientHeight

    // scoreSystem already calls BB_GAME_UI.showScore via ScoreSystem callback
    // This is just an optional extra world-position popup
  }

  showStunEffect(playerSide) {
    if (window.BB_GAME_UI?.showStun) {
      window.BB_GAME_UI.showStun(playerSide)
    }
  }

  updateScores(s0, s1) {
    if (window.BB_GAME_UI?.updateScore) {
      window.BB_GAME_UI.updateScore(s0, s1)
    }
  }
}
