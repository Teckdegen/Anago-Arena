import { GAME_CONFIG } from '../config.js'

/*
  Hoop visual matches the reference image:
  - Large white rectangular backboard with red rounded border
  - Red inner target square
  - Thick red flat rim (torus)
  - Red bracket pad connecting rim to backboard
  - White diamond-mesh net hanging below
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

    const WHITE = 0xF4F4F4
    const RED   = 0xE8251A
    const NET   = 0xEEEEEE

    // ── BACKBOARD ─────────────────────────────────────
    // Oriented so it faces the player (thin on X, wide on Z, tall on Y)
    const bbW = r * 5.0   // width  (Z axis)
    const bbH = r * 3.6   // height (Y axis)
    const bbD = 0.07      // depth  (X axis)
    const bbY = py + r * 1.6   // sits above the rim

    const bbGeo = new T.BoxGeometry(bbD, bbH, bbW)
    const bbMat = new T.MeshToonMaterial({ color: WHITE })
    this.backboard = new T.Mesh(bbGeo, bbMat)
    this.backboard.position.set(px, bbY, pz)
    this.backboard.castShadow = true
    this.scene.add(this.backboard)
    this._meshes.push(this.backboard)

    // Red border — 4 bars around the backboard edge
    const bt  = 0.05   // border thickness
    const bMat = new T.MeshToonMaterial({ color: RED })
    const bd   = bbD + 0.01

    // Top
    this._bar(T, bMat, bd, bt, bbW,       px, bbY + bbH * 0.5 - bt * 0.5, pz)
    // Bottom
    this._bar(T, bMat, bd, bt, bbW,       px, bbY - bbH * 0.5 + bt * 0.5, pz)
    // Left
    this._bar(T, bMat, bd, bbH - bt * 2, bt, px, bbY, pz - bbW * 0.5 + bt * 0.5)
    // Right
    this._bar(T, bMat, bd, bbH - bt * 2, bt, px, bbY, pz + bbW * 0.5 - bt * 0.5)

    // Inner target square (sits in lower-centre of backboard)
    const sqW = bbW * 0.40
    const sqH = bbH * 0.36
    const sqT = 0.045
    const sqY = bbY - bbH * 0.10   // slightly below centre
    const sqd = bbD + 0.02

    this._bar(T, bMat, sqd, sqT, sqW,       px, sqY + sqH * 0.5,  pz)
    this._bar(T, bMat, sqd, sqT, sqW,       px, sqY - sqH * 0.5,  pz)
    this._bar(T, bMat, sqd, sqH - sqT, sqT, px, sqY, pz - sqW * 0.5 + sqT * 0.5)
    this._bar(T, bMat, sqd, sqH - sqT, sqT, px, sqY, pz + sqW * 0.5 - sqT * 0.5)

    // ── RIM ───────────────────────────────────────────
    // Thick torus, horizontal, red
    const rimTube = 0.072
    const rimGeo  = new T.TorusGeometry(r, rimTube, 10, 32)
    const rimMat  = new T.MeshToonMaterial({ color: RED })
    this.rimMesh  = new T.Mesh(rimGeo, rimMat)
    this.rimMesh.position.set(px, py, pz)
    this.rimMesh.rotation.x = Math.PI / 2
    this.rimMesh.castShadow = true
    this.scene.add(this.rimMesh)
    this._meshes.push(this.rimMesh)

    // Bracket pad — red box connecting rim to backboard
    const padGeo  = new T.BoxGeometry(0.20, rimTube * 2.2, r * 1.2)
    const padMesh = new T.Mesh(padGeo, new T.MeshToonMaterial({ color: RED }))
    padMesh.position.set(px, py + rimTube * 0.5, pz)
    this.scene.add(padMesh)
    this._meshes.push(padMesh)

    // ── NET ───────────────────────────────────────────
    this._buildNet(T, NET, px, py - rimTube, pz, r)

    // ── PHYSICS ───────────────────────────────────────
    const rimPhysMat = new C.Material({ restitution: 0.4, friction: 0.5 })

    // Two rim collision spheres (left & right of hoop in Z)
    ;[-r, r].forEach(dz => {
      const b = new C.Body({ mass: 0, material: rimPhysMat })
      b.addShape(new C.Sphere(rimTube * 1.2))
      b.position.set(px, py, pz + dz)
      this.world.addBody(b)
      this._bodies.push(b)
    })

    // Backboard collision
    const bbBody = new C.Body({ mass: 0 })
    bbBody.addShape(new C.Box(new C.Vec3(bbD * 0.5, bbH * 0.5, bbW * 0.5)))
    bbBody.position.set(px, bbY, pz)
    this.world.addBody(bbBody)
    this._bodies.push(bbBody)
  }

  // Reusable bar helper
  _bar(T, mat, dx, dy, dz, x, y, z) {
    const mesh = new T.Mesh(new T.BoxGeometry(dx, dy, dz), mat)
    mesh.position.set(x, y, z)
    this.scene.add(mesh)
    this._meshes.push(mesh)
    return mesh
  }

  // Diamond-mesh net built from line segments
  _buildNet(T, color, px, py, pz, rimR) {
    const netH = rimR * 1.6
    const rows = 8
    const cols = 16
    const mat  = new T.LineBasicMaterial({ color, transparent: true, opacity: 0.82 })

    // Build vertex grid
    const verts = []
    for (let r = 0; r <= rows; r++) {
      const t     = r / rows
      const ringR = rimR * (1 - t * 0.48)   // taper inward toward bottom
      const y     = py - t * netH
      const row   = []
      for (let c = 0; c < cols; c++) {
        const angle = (c / cols) * Math.PI * 2
        row.push(new T.Vector3(
          px + Math.sin(angle) * ringR * 0.18,  // slight X spread for 2.5D depth
          y,
          pz + Math.cos(angle) * ringR
        ))
      }
      verts.push(row)
    }

    // Horizontal rings
    for (let r = 0; r <= rows; r++) {
      const pts = [...verts[r], verts[r][0].clone()]
      const geo = new T.BufferGeometry().setFromPoints(pts)
      const line = new T.Line(geo, mat)
      this.scene.add(line)
      this._meshes.push(line)
    }

    // Vertical strands
    for (let c = 0; c < cols; c++) {
      const pts = verts.map(row => row[c])
      const geo = new T.BufferGeometry().setFromPoints(pts)
      const line = new T.Line(geo, mat)
      this.scene.add(line)
      this._meshes.push(line)
    }

    // Diagonal strands (creates diamond pattern)
    for (let c = 0; c < cols; c++) {
      const pts = []
      for (let r = 0; r <= rows; r++) {
        pts.push(verts[r][(c + r) % cols])
      }
      const geo = new T.BufferGeometry().setFromPoints(pts)
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

  // Ball passes through hoop from above
  checkScore(ballMesh, prevBallY) {
    const bx = ballMesh.position.x
    const by = ballMesh.position.y
    const bz = ballMesh.position.z
    const hy = this.position.y
    const hz = this.position.z
    const hx = this.position.x

    const wasAbove    = prevBallY > hy
    const isAtOrBelow = by <= hy
    const inX         = Math.abs(bx - hx) < 0.4
    const inZ         = Math.abs(bz - hz) < this.radius * 0.80

    if (wasAbove && isAtOrBelow && inX && inZ) {
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
      const bounce = Math.abs(Math.sin(this._netAnim)) * 0.10
      this.rimMesh.scale.set(1 + bounce * 0.25, 1, 1 + bounce * 0.25)
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
