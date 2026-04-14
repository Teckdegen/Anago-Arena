export class DragArrow {
  constructor(scene, THREE) {
    this.scene = scene
    this.THREE = THREE
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)

    this._dots = []
    this._lineMesh = null
    this._headMeshes = []
    this._buildArrow()
    this._buildDots()
  }

  _buildArrow() {
    const T = this.THREE
    // Main line
    const geo = new T.BufferGeometry()
    const positions = new Float32Array(6) // 2 points × 3 coords
    geo.setAttribute('position', new T.BufferAttribute(positions, 3))
    const mat = new T.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 })
    this._lineMesh = new T.Line(geo, mat)
    this.group.add(this._lineMesh)

    // Arrowhead V shape (2 lines)
    for (let i = 0; i < 2; i++) {
      const hGeo = new T.BufferGeometry()
      const hPos = new Float32Array(6)
      hGeo.setAttribute('position', new T.BufferAttribute(hPos, 3))
      const hMat = new T.LineBasicMaterial({ color: 0xFFFF00 })
      const hLine = new T.Line(hGeo, hMat)
      this.group.add(hLine)
      this._headMeshes.push(hLine)
    }
  }

  _buildDots() {
    const T = this.THREE
    for (let i = 0; i < 12; i++) {
      const geo = new T.SphereGeometry(0.065, 6, 6)
      const mat = new T.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 1 - i * 0.07,
      })
      const mesh = new T.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this._dots.push({ mesh, mat, baseOpacity: 1 - i * 0.07 })
    }
  }

  update(startWorld, endWorld, gravity = 15) {
    this.group.visible = true

    const dx = startWorld.x - endWorld.x
    const dy = startWorld.y - endWorld.y
    const rawPower = Math.sqrt(dx * dx + dy * dy)
    const power = Math.max(3, Math.min(14, rawPower * 2.2))

    // Power ratio for colouring
    const ratio = power / 14

    // ── Main line ────────────────────────────────────
    const linePos = this._lineMesh.geometry.attributes.position.array
    linePos[0] = startWorld.x; linePos[1] = startWorld.y; linePos[2] = 0
    linePos[3] = endWorld.x;   linePos[4] = endWorld.y;   linePos[5] = 0
    this._lineMesh.geometry.attributes.position.needsUpdate = true

    // Colour by power
    const r = ratio
    const g = 1 - ratio * 0.7
    this._lineMesh.material.color.setRGB(r, g, 0.2)

    // ── Arrowhead ────────────────────────────────────
    const angle = Math.atan2(dy, dx)
    const headSize = 0.3
    const hx = endWorld.x
    const hy = endWorld.y
    const ah1 = this._headMeshes[0].geometry.attributes.position.array
    const ah2 = this._headMeshes[1].geometry.attributes.position.array
    ah1[0] = hx; ah1[1] = hy; ah1[2] = 0
    ah1[3] = hx + Math.cos(angle + 2.4) * headSize
    ah1[4] = hy + Math.sin(angle + 2.4) * headSize
    ah1[5] = 0
    ah2[0] = hx; ah2[1] = hy; ah2[2] = 0
    ah2[3] = hx + Math.cos(angle - 2.4) * headSize
    ah2[4] = hy + Math.sin(angle - 2.4) * headSize
    ah2[5] = 0
    this._headMeshes[0].geometry.attributes.position.needsUpdate = true
    this._headMeshes[1].geometry.attributes.position.needsUpdate = true

    // ── Trajectory dots ──────────────────────────────
    const vx = dx * 0.5 * power
    const vy = Math.abs(dy) * 0.5 * power + power * 0.45

    this._dots.forEach((d, i) => {
      const t = (i + 1) * 0.10
      const px = startWorld.x + vx * t
      const py = startWorld.y + vy * t - 0.5 * gravity * t * t
      if (py > -1) {
        d.mesh.position.set(px, py, 0.05)
        d.mesh.visible = true
        d.mat.opacity = d.baseOpacity * (1 - i / this._dots.length * 0.5)
      } else {
        d.mesh.visible = false
      }
    })
  }

  hide() {
    this.group.visible = false
    this._dots.forEach(d => { d.mesh.visible = false })
  }

  dispose() {
    this.scene.remove(this.group)
    this.group.traverse(child => {
      if (child.isMesh || child.isLine) {
        child.geometry?.dispose()
        child.material?.dispose()
      }
    })
  }
}
