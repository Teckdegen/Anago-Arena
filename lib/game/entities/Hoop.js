import { GAME_CONFIG } from '../config.js'

/*
  Flat 2D-style hoop — always faces the camera (screen-facing).
  Backboard = flat plane with canvas texture drawn on it.
  Rim = flat torus (rotated to face camera).
  Net = flat 2D lines hanging down.
  Never rotates, never moves.
*/
export class Hoop {
  constructor(scene, physicsWorld, THREE, CANNON, position, radius) {
    this.scene    = scene
    this.world    = physicsWorld
    this.THREE    = THREE
    this.CANNON   = CANNON
    this.position = new THREE.Vector3(position.x, position.y, position.z)
    this.radius   = radius || 0.55

    this._meshes      = []
    this._bodies      = []
    this._netAnim     = 0
    this._celebrating = false

    this._build()
  }

  _build() {
    const T  = this.THREE
    const C  = this.CANNON
    const px = this.position.x
    const py = this.position.y
    const pz = this.position.z
    const r  = this.radius

    // ── BACKBOARD — flat plane with canvas texture ─────
    const bbW = r * 5.2
    const bbH = r * 3.8
    const bbY = py + r * 1.7

    // Draw backboard on canvas
    const cvs = document.createElement('canvas')
    cvs.width  = 512
    cvs.height = 384
    const ctx  = cvs.getContext('2d')

    // White fill
    ctx.fillStyle = '#F4F4F4'
    ctx.beginPath()
    ctx.roundRect(4, 4, 504, 376, 18)
    ctx.fill()

    // Red outer border
    ctx.strokeStyle = '#E8251A'
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.roundRect(9, 9, 494, 366, 14)
    ctx.stroke()

    // Red inner target square — lower centre
    ctx.strokeStyle = '#E8251A'
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.roundRect(156, 200, 200, 140, 8)
    ctx.stroke()

    const tex = new T.CanvasTexture(cvs)
    const bbGeo = new T.PlaneGeometry(bbW, bbH)
    const bbMat = new T.MeshBasicMaterial({ map: tex, transparent: false })
    this.backboard = new T.Mesh(bbGeo, bbMat)
    this.backboard.position.set(px, bbY, pz + 0.01)
    this.scene.add(this.backboard)
    this._meshes.push(this.backboard)

    // ── RIM — flat torus facing camera ─────────────────
    // Use a flat ring (torus with very small tube, facing Z)
    const rimTube = 0.065
    const rimGeo  = new T.TorusGeometry(r, rimTube, 8, 32)
    const rimMat  = new T.MeshBasicMaterial({ color: 0xE8251A })
    this.rimMesh  = new T.Mesh(rimGeo, rimMat)
    // Face camera: torus default is in XY plane — perfect, no rotation needed
    this.rimMesh.position.set(px, py, pz + 0.05)
    this.scene.add(this.rimMesh)
    this._meshes.push(this.rimMesh)

    // Rim fill (solid red disc behind torus for thickness)
    const discGeo = new T.CircleGeometry(r + rimTube, 32)
    const discMat = new T.MeshBasicMaterial({ color: 0xE8251A })
    const disc    = new T.Mesh(discGeo, discMat)
    disc.position.set(px, py, pz + 0.02)
    this.scene.add(disc)
    this._meshes.push(disc)

    // Inner disc (white hole)
    const holeGeo = new T.CircleGeometry(r - rimTube, 32)
    const holeMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
    const hole    = new T.Mesh(holeGeo, holeMat)
    hole.position.set(px, py, pz + 0.06)
    this.scene.add(hole)
    this._meshes.push(hole)

    // ── NET — flat 2D lines hanging below rim ──────────
    this._buildFlatNet(T, px, py - rimTube * 0.5, pz + 0.04, r)

    // ── PHYSICS ────────────────────────────────────────
    // Two thin sensor bodies at rim edges (left/right in X for 2.5D)
    const rimMat2 = new C.Material({ restitution: 0.35, friction: 0.5 })
    ;[-r * 0.85, r * 0.85].forEach(dx => {
      const b = new C.Body({ mass: 0, material: rimMat2 })
      b.addShape(new C.Sphere(rimTube * 1.5))
      b.position.set(px + dx, py, pz)
      this.world.addBody(b)
      this._bodies.push(b)
    })

    // Backboard physics (thin slab)
    const bbBody = new C.Body({ mass: 0 })
    bbBody.addShape(new C.Box(new C.Vec3(bbW * 0.5, bbH * 0.5, 0.05)))
    bbBody.position.set(px, bbY, pz)
    this.world.addBody(bbBody)
    this._bodies.push(bbBody)
  }

  _buildFlatNet(T, px, py, pz, rimR) {
    const netH = rimR * 1.5
    const cols = 10   // vertical strands
    const rows = 6    // horizontal lines
    const mat  = new T.LineBasicMaterial({ color: 0xDDDDDD, transparent: true, opacity: 0.9 })

    // Vertical strands
    for (let c = 0; c <= cols; c++) {
      const t  = c / cols
      const x  = px + (t - 0.5) * rimR * 2
      const x2 = px + (t - 0.5) * rimR * 2 * 0.55  // taper inward
      const pts = [
        new T.Vector3(x,  py,          pz),
        new T.Vector3(x2, py - netH,   pz),
      ]
      const geo  = new T.BufferGeometry().setFromPoints(pts)
      const line = new T.Line(geo, mat)
      this.scene.add(line)
      this._meshes.push(line)
    }

    // Horizontal lines
    for (let row = 0; row <= rows; row++) {
      const t    = row / rows
      const y    = py - t * netH
      const xOff = rimR * (1 - t * 0.45)  // taper
      const pts  = [
        new T.Vector3(px - xOff, y, pz),
        new T.Vector3(px + xOff, y, pz),
      ]
      const geo  = new T.BufferGeometry().setFromPoints(pts)
      const line = new T.Line(geo, mat)
      this.scene.add(line)
      this._meshes.push(line)
    }
  }

  setRadius(radius) {
    this.radius = radius
    this._dispose()
    this._build()
  }

  // Ball passes through hoop from above — check in X/Y plane (2D)
  checkScore(ballMesh, prevBallY) {
    const bx = ballMesh.position.x
    const by = ballMesh.position.y
    const hy = this.position.y
    const hx = this.position.x

    const wasAbove    = prevBallY > hy
    const isAtOrBelow = by <= hy
    const inX         = Math.abs(bx - hx) < this.radius * 0.85

    if (wasAbove && isAtOrBelow && inX) {
      return { scored: true }
    }
    return { scored: false }
  }

  celebrateScore() {
    this._celebrating = true
    this._netAnim     = 0
  }

  update(delta) {
    if (this._celebrating) {
      this._netAnim += delta * 10
      const s = 1 + Math.abs(Math.sin(this._netAnim)) * 0.12
      this.rimMesh.scale.set(s, s, 1)
      if (this._netAnim > Math.PI * 2.5) {
        this._celebrating = false
        this.rimMesh.scale.set(1, 1, 1)
      }
    }
  }

  _dispose() {
    this._meshes.forEach(m => {
      this.scene.remove(m)
      m.geometry?.dispose()
      if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose())
      else m.material?.dispose()
    })
    this._bodies.forEach(b => this.world.removeBody(b))
    this._meshes = []
    this._bodies = []
  }

  dispose() { this._dispose() }
}
