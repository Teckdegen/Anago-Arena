import { GAME_CONFIG } from '../config.js'

export class Hoop {
  constructor(scene, physicsWorld, THREE, CANNON, position, radius) {
    this.scene = scene
    this.world = physicsWorld
    this.THREE = THREE
    this.CANNON = CANNON
    this.position = new THREE.Vector3(position.x, position.y, position.z)
    this.radius = radius || 0.55

    this._meshes = []
    this._bodies = []
    this._netAnim = 0
    this._celebrating = false

    this._build()
  }

  _build() {
    const T = this.THREE
    const C = this.CANNON

    // ── Backboard ─────────────────────────────────────
    const bbGeo = new T.BoxGeometry(0.12, 1.4, 1.8)
    const bbMat = new T.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    this.backboard = new T.Mesh(bbGeo, bbMat)
    this.backboard.position.copy(this.position)
    this.backboard.position.y += 0.5
    this.backboard.castShadow = true
    this.scene.add(this.backboard)
    this._meshes.push(this.backboard)

    // Backboard red square
    const squareGeo = new T.BoxGeometry(0.11, 0.5, 0.6)
    const squareMat = new T.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
    })
    const square = new T.Mesh(squareGeo, squareMat)
    square.position.copy(this.position)
    square.position.y += 0.35
    this.scene.add(square)
    this._meshes.push(square)

    // ── Rim ──────────────────────────────────────────
    const rimGeo = new T.TorusGeometry(this.radius, 0.045, 8, 24)
    const rimMat = new T.MeshToonMaterial({ color: 0xFF4500 })
    this.rimMesh = new T.Mesh(rimGeo, rimMat)
    this.rimMesh.position.copy(this.position)
    this.rimMesh.rotation.x = Math.PI / 2
    this.scene.add(this.rimMesh)
    this._meshes.push(this.rimMesh)

    // ── Net ──────────────────────────────────────────
    const netGeo = new T.CylinderGeometry(this.radius * 0.9, this.radius * 0.45, 0.55, 12, 1, true)
    const netMat = new T.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    })
    this.netMesh = new T.Mesh(netGeo, netMat)
    this.netMesh.position.copy(this.position)
    this.netMesh.position.y -= 0.28
    this.scene.add(this.netMesh)
    this._meshes.push(this.netMesh)

    // ── Physics: rim posts ───────────────────────────
    const rimPostMat = new this.CANNON.Material({ restitution: 0.45, friction: 0.4 })

    const makeRimPost = (offsetX) => {
      const b = new C.Body({ mass: 0, material: rimPostMat })
      b.addShape(new C.Box(new C.Vec3(0.06, 0.06, 0.35)))
      b.position.set(
        this.position.x + offsetX,
        this.position.y,
        this.position.z
      )
      this.world.addBody(b)
      this._bodies.push(b)
    }
    makeRimPost(-this.radius)
    makeRimPost(this.radius)

    // Backboard physics
    const bbBody = new C.Body({ mass: 0 })
    bbBody.addShape(new C.Box(new C.Vec3(0.07, 0.7, 0.9)))
    bbBody.position.set(this.position.x, this.position.y + 0.5, this.position.z)
    this.world.addBody(bbBody)
    this._bodies.push(bbBody)
  }

  setRadius(radius) {
    this.radius = radius
    // Rebuild
    this._dispose()
    this._build()
  }

  // Returns { scored: bool, side: 'left'|'right' }
  checkScore(ballMesh, prevBallY) {
    const bx = ballMesh.position.x
    const by = ballMesh.position.y
    const hx = this.position.x
    const hy = this.position.y

    const wasAbove = prevBallY > hy
    const isAtOrBelow = by <= hy
    const inX = Math.abs(bx - hx) < this.radius * 0.82
    const inZ = Math.abs(ballMesh.position.z) < 0.4

    if (wasAbove && isAtOrBelow && inX && inZ) {
      const side = bx < 0 ? 'left' : 'right'
      return { scored: true, side }
    }
    return { scored: false }
  }

  celebrateScore() {
    this._celebrating = true
    this._netAnim = 0
  }

  update(delta) {
    if (this._celebrating) {
      this._netAnim += delta * 8
      const scale = 1 + Math.sin(this._netAnim) * 0.18
      this.netMesh.scale.set(1, scale, 1)
      if (this._netAnim > Math.PI * 2) {
        this._celebrating = false
        this.netMesh.scale.set(1, 1, 1)
      }
    }
  }

  _dispose() {
    this._meshes.forEach(m => {
      this.scene.remove(m)
      m.geometry?.dispose()
      m.material?.dispose()
    })
    this._bodies.forEach(b => this.world.removeBody(b))
    this._meshes = []
    this._bodies = []
  }

  dispose() { this._dispose() }
}
