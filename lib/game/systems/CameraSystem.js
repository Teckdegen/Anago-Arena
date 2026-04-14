export class CameraSystem {
  constructor(camera, balls, THREE) {
    this.camera = camera
    this.balls = balls
    this.THREE = THREE
    this._targetX = 0
    this._targetY = 3.5
    this._shakeTimer = 0
    this._shakeIntensity = 0
    this._lerpFactor = 0.04
  }

  shake(intensity = 0.3, duration = 0.4) {
    this._shakeIntensity = intensity
    this._shakeTimer = duration
  }

  update(delta) {
    const flying = this.balls.filter(b => b.state === 'flying')

    let tx = 0
    let ty = 3.5

    if (flying.length > 0) {
      let sumX = 0
      let sumY = 0
      flying.forEach(b => {
        sumX += b.mesh.position.x
        sumY += b.mesh.position.y
      })
      tx = sumX / flying.length
      ty = sumY / flying.length
    }

    // Clamp
    tx = Math.max(-3, Math.min(3, tx))
    ty = Math.max(2.5, Math.min(7, ty))

    this._targetX += (tx - this._targetX) * this._lerpFactor
    this._targetY += (ty - this._targetY) * this._lerpFactor

    this.camera.position.x = this._targetX
    this.camera.position.y = this._targetY

    // Camera shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= delta
      const s = this._shakeIntensity * (this._shakeTimer / 0.4)
      this.camera.position.x += (Math.random() - 0.5) * s
      this.camera.position.y += (Math.random() - 0.5) * s
    }

    this.camera.lookAt(this._targetX, this._targetY, 0)
  }
}
