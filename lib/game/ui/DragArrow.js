export class DragArrow {
  constructor(scene, THREE) {
    this.scene = scene
    this.THREE = THREE
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)

    this._line     = null
    this._head1    = null
    this._head2    = null
    this._dots     = []
    this._build()
  }

  _build() {
    const T = this.THREE

    // ── Main straight line ────────────────────────────
    const lineGeo = new T.BufferGeometry()
    lineGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3))
    this._line = new T.Line(lineGeo, new T.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
    }))
    this.group.add(this._line)

    // ── Arrowhead — two straight lines forming a V ────
    for (let i = 0; i < 2; i++) {
      const geo = new T.BufferGeometry()
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3))
      const line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xFFFF00 }))
      this.group.add(line)
      if (i === 0) this._head1 = line
      else         this._head2 = line
    }

    // ── Power dots along the line ─────────────────────
    for (let i = 0; i < 8; i++) {
      const geo  = new T.SphereGeometry(0.07 - i * 0.006, 6, 6)
      const mat  = new T.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 1 - i * 0.11,
      })
      const mesh = new T.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this._dots.push({ mesh, mat })
    }
  }

  update(startWorld, endWorld, gravity = 15) {
    this.group.visible = true

    const dx = startWorld.x - endWorld.x
    const dy = startWorld.y - endWorld.y
    const raw   = Math.sqrt(dx * dx + dy * dy)
    const power = Math.max(3, Math.min(14, raw * 2.2))
    const ratio = power / 14

    // ── Straight line from start to end ──────────────
    const lp = this._line.geometry.attributes.position.array
    lp[0] = startWorld.x; lp[1] = startWorld.y; lp[2] = 0.05
    lp[3] = endWorld.x;   lp[4] = endWorld.y;   lp[5] = 0.05
    this._line.geometry.attributes.position.needsUpdate = true

    // Colour by power: green → yellow → red
    if (ratio < 0.5) {
      this._line.material.color.setRGB(ratio * 2, 1, 0.2)
    } else {
      this._line.material.color.setRGB(1, 1 - (ratio - 0.5) * 2, 0.2)
    }

    // ── Arrowhead at the END point ────────────────────
    // Direction from start → end
    const len   = Math.sqrt(dx * dx + dy * dy) || 1
    const nx    = dx / len   // normalised direction (start→end)
    const ny    = dy / len
    const hs    = 0.35       // arrowhead arm length
    const angle = 0.45       // arrowhead spread angle (radians)

    const ex = endWorld.x, ey = endWorld.y

    // Arm 1: rotate direction by +angle
    const a1x = ex + (nx * Math.cos(angle)  - ny * Math.sin(angle))  * hs
    const a1y = ey + (nx * Math.sin(angle)  + ny * Math.cos(angle))  * hs
    // Arm 2: rotate direction by -angle
    const a2x = ex + (nx * Math.cos(-angle) - ny * Math.sin(-angle)) * hs
    const a2y = ey + (nx * Math.sin(-angle) + ny * Math.cos(-angle)) * hs

    const h1 = this._head1.geometry.attributes.position.array
    h1[0] = ex;  h1[1] = ey;  h1[2] = 0.05
    h1[3] = a1x; h1[4] = a1y; h1[5] = 0.05
    this._head1.geometry.attributes.position.needsUpdate = true

    const h2 = this._head2.geometry.attributes.position.array
    h2[0] = ex;  h2[1] = ey;  h2[2] = 0.05
    h2[3] = a2x; h2[4] = a2y; h2[5] = 0.05
    this._head2.geometry.attributes.position.needsUpdate = true

    // ── Dots evenly spaced along the straight line ────
    this._dots.forEach((d, i) => {
      const t  = (i + 1) / (this._dots.length + 1)
      const px = startWorld.x + (endWorld.x - startWorld.x) * t
      const py = startWorld.y + (endWorld.y - startWorld.y) * t
      d.mesh.position.set(px, py, 0.08)
      d.mesh.visible  = true
      d.mat.opacity   = Math.max(0, 0.85 - i * 0.1)
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
