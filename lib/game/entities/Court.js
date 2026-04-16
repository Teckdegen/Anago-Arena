import { GAME_CONFIG } from '../config.js'

export class Court {
  constructor(scene, physicsWorld, THREE, CANNON) {
    this.scene = scene
    this.world = physicsWorld
    this.THREE = THREE
    this.CANNON = CANNON
    this._meshes = []
    this._bodies = []
  }

  rebuild(levelConfig) {
    this._dispose()
    const T = this.THREE
    const C = this.CANNON
    const theme = levelConfig.courtTheme
    const wallH = levelConfig.wallHeight || 3

    // ── Floor ────────────────────────────────────────
    const floorGeo = new T.BoxGeometry(16, 0.4, 3)
    const floorMat = new T.MeshToonMaterial({ color: theme.floor })
    const floorMesh = new T.Mesh(floorGeo, floorMat)
    floorMesh.position.set(0, -0.2, 0)
    floorMesh.receiveShadow = true
    this.scene.add(floorMesh)
    this._meshes.push(floorMesh)

    const floorBody = new C.Body({ mass: 0 })
    floorBody.addShape(new C.Box(new C.Vec3(8, 0.2, 1.5)))
    floorBody.position.set(0, -0.2, 0)
    this.world.addBody(floorBody)
    this._bodies.push(floorBody)

    // ── Court line (centre) ───────────────────────────
    const lineGeo = new T.BoxGeometry(0.06, 0.02, 3)
    const lineMat = new T.MeshBasicMaterial({ color: theme.line, transparent: true, opacity: 0.5 })
    const lineMesh = new T.Mesh(lineGeo, lineMat)
    lineMesh.position.set(0, 0.01, 0)
    this.scene.add(lineMesh)
    this._meshes.push(lineMesh)

    // ── Centre dividing wall ──────────────────────────
    const wt = GAME_CONFIG.WALL_THICKNESS
    const wallGeo = new T.BoxGeometry(wt, wallH, 2.5)
    const wallMat = new T.MeshToonMaterial({ color: theme.wall })
    const wallMesh = new T.Mesh(wallGeo, wallMat)
    wallMesh.position.set(0, wallH / 2, 0)
    wallMesh.castShadow = true
    wallMesh.receiveShadow = true
    this.scene.add(wallMesh)
    this._meshes.push(wallMesh)
    this.wallMesh = wallMesh

    const wallBody = new C.Body({ mass: 0 })
    wallBody.addShape(new C.Box(new C.Vec3(wt / 2, wallH / 2, 1.25)))
    wallBody.position.set(0, wallH / 2, 0)
    this.world.addBody(wallBody)
    this._bodies.push(wallBody)

    // ── Left boundary ─────────────────────────────────
    const lBound = new C.Body({ mass: 0 })
    lBound.addShape(new C.Box(new C.Vec3(0.2, 8, 2)))
    lBound.position.set(-8.2, 4, 0)
    this.world.addBody(lBound)
    this._bodies.push(lBound)

    // ── Right boundary ────────────────────────────────
    const rBound = new C.Body({ mass: 0 })
    rBound.addShape(new C.Box(new C.Vec3(0.2, 8, 2)))
    rBound.position.set(8.2, 4, 0)
    this.world.addBody(rBound)
    this._bodies.push(rBound)

    // ── Ceiling ──────────────────────────────────────
    const ceiling = new C.Body({ mass: 0 })
    ceiling.addShape(new C.Box(new C.Vec3(9, 0.2, 2)))
    ceiling.position.set(0, 10.2, 0)
    this.world.addBody(ceiling)
    this._bodies.push(ceiling)

    // ── Background gradient plane ─────────────────────
    const bgGeo = new T.PlaneGeometry(22, 16)
    const bgMat = new T.MeshBasicMaterial({ color: theme.bg })
    const bgMesh = new T.Mesh(bgGeo, bgMat)
    bgMesh.position.set(0, 4, -4)
    this.scene.add(bgMesh)
    this._meshes.push(bgMesh)

    // ── Visible court boundary outline ───────────────
    // Bright glowing lines showing the edges the ball cannot pass
    const edgeMat = new T.MeshBasicMaterial({ color: 0xFFFF00 })
    const edgeH = 11  // full playable height

    // Left wall outline
    const leftEdge = new T.Mesh(new T.BoxGeometry(0.08, edgeH, 0.08), edgeMat)
    leftEdge.position.set(-8, edgeH / 2, 0)
    this.scene.add(leftEdge); this._meshes.push(leftEdge)

    // Right wall outline
    const rightEdge = new T.Mesh(new T.BoxGeometry(0.08, edgeH, 0.08), edgeMat)
    rightEdge.position.set(8, edgeH / 2, 0)
    this.scene.add(rightEdge); this._meshes.push(rightEdge)

    // Top boundary line
    const topEdge = new T.Mesh(new T.BoxGeometry(16, 0.08, 0.08), edgeMat)
    topEdge.position.set(0, 10, 0)
    this.scene.add(topEdge); this._meshes.push(topEdge)

    // Floor edge line (bright)
    const floorEdge = new T.Mesh(new T.BoxGeometry(16, 0.06, 0.06), edgeMat)
    floorEdge.position.set(0, 0.02, 0)
    this.scene.add(floorEdge); this._meshes.push(floorEdge)

    this.wallHeight = wallH
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
}
