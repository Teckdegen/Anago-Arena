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

    // Court dimensions — must match GAME_CONFIG and BallSystem
    const hw     = GAME_CONFIG.COURT_HALF_WIDTH  // 12
    const courtH = 14   // full visible court height (floor=0 to top=14)

    // ── Floor ────────────────────────────────────────
    const floorGeo = new T.BoxGeometry(hw * 2, 0.4, 3)
    const floorMat = new T.MeshToonMaterial({ color: theme.floor })
    const floorMesh = new T.Mesh(floorGeo, floorMat)
    floorMesh.position.set(0, -0.2, 0)
    floorMesh.receiveShadow = true
    this.scene.add(floorMesh)
    this._meshes.push(floorMesh)

    const floorBody = new C.Body({ mass: 0 })
    floorBody.addShape(new C.Box(new C.Vec3(hw, 0.2, 1.5)))
    floorBody.position.set(0, -0.2, 0)
    this.world.addBody(floorBody)
    this._bodies.push(floorBody)

    // ── Court line (centre floor marker) ─────────────
    const lineGeo = new T.BoxGeometry(0.06, 0.02, 3)
    const lineMat = new T.MeshBasicMaterial({ color: theme.line, transparent: true, opacity: 0.5 })
    const lineMesh = new T.Mesh(lineGeo, lineMat)
    lineMesh.position.set(0, 0.01, 0)
    this.scene.add(lineMesh)
    this._meshes.push(lineMesh)

    // ── Centre dividing wall — full court height ──────
    // This is a SOLID wall the ball cannot pass through.
    // Physics body is tall enough to block any shot.
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

    // Physics body for center wall — store reference so BallSystem can use it
    const wallBody = new C.Body({ mass: 0 })
    wallBody.addShape(new C.Box(new C.Vec3(wt / 2, wallH / 2, 1.25)))
    wallBody.position.set(0, wallH / 2, 0)
    this.world.addBody(wallBody)
    this._bodies.push(wallBody)
    this.centerWallBody = wallBody
    this.centerWallHeight = wallH

    // ── Left side wall — visible + physics ───────────
    const sideWallMat = new T.MeshToonMaterial({ color: theme.wall })
    const leftWallGeo = new T.BoxGeometry(0.35, courtH, 2.5)
    const leftWallMesh = new T.Mesh(leftWallGeo, sideWallMat)
    leftWallMesh.position.set(-hw, courtH / 2, 0)
    leftWallMesh.castShadow = true
    this.scene.add(leftWallMesh)
    this._meshes.push(leftWallMesh)

    const lBound = new C.Body({ mass: 0 })
    lBound.addShape(new C.Box(new C.Vec3(0.2, courtH / 2 + 1, 2)))
    lBound.position.set(-hw - 0.15, courtH / 2, 0)
    this.world.addBody(lBound)
    this._bodies.push(lBound)

    // ── Right side wall — visible + physics ──────────
    const rightWallGeo = new T.BoxGeometry(0.35, courtH, 2.5)
    const rightWallMesh = new T.Mesh(rightWallGeo, sideWallMat.clone())
    rightWallMesh.position.set(hw, courtH / 2, 0)
    rightWallMesh.castShadow = true
    this.scene.add(rightWallMesh)
    this._meshes.push(rightWallMesh)

    const rBound = new C.Body({ mass: 0 })
    rBound.addShape(new C.Box(new C.Vec3(0.2, courtH / 2 + 1, 2)))
    rBound.position.set(hw + 0.15, courtH / 2, 0)
    this.world.addBody(rBound)
    this._bodies.push(rBound)

    // ── Ceiling physics ───────────────────────────────
    const ceiling = new C.Body({ mass: 0 })
    ceiling.addShape(new C.Box(new C.Vec3(hw + 1, 0.2, 2)))
    ceiling.position.set(0, courtH + 0.2, 0)
    this.world.addBody(ceiling)
    this._bodies.push(ceiling)

    // ── Background gradient plane ─────────────────────
    const bgGeo = new T.PlaneGeometry(hw * 2 + 4, courtH + 4)
    const bgMat = new T.MeshBasicMaterial({ color: theme.bg })
    const bgMesh = new T.Mesh(bgGeo, bgMat)
    bgMesh.position.set(0, courtH / 2, -4)
    this.scene.add(bgMesh)
    this._meshes.push(bgMesh)

    // ── Visible court boundary outline ───────────────
    const edgeMat = new T.MeshBasicMaterial({ color: 0xFFFF00 })

    // Top boundary line
    const topEdge = new T.Mesh(new T.BoxGeometry(hw * 2, 0.1, 0.1), edgeMat)
    topEdge.position.set(0, courtH, 0)
    this.scene.add(topEdge); this._meshes.push(topEdge)

    // Floor edge line
    const floorEdge = new T.Mesh(new T.BoxGeometry(hw * 2, 0.07, 0.07), edgeMat)
    floorEdge.position.set(0, 0.02, 0)
    this.scene.add(floorEdge); this._meshes.push(floorEdge)

    this.wallHeight = wallH
    this.courtHeight = courtH
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
