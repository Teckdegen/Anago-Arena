export class DragArrow {
  constructor(scene, THREE) {
    this.scene = scene
    this.THREE = THREE
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)
    this._build()
  }

  _build() {
    const T = this.THREE

    // ── Thick line — use a flat box mesh so it's visible on mobile WebGL
    // linewidth in WebGL is always 1px; use a thin box instead
    const lineGeo = new T.BoxGeometry(1, 0.18, 0.04)  // width set dynamically, height = thickness
    this._lineMat = new T.MeshBasicMaterial({ color: 0xFFFFFF })
    this._lineMesh = new T.Mesh(lineGeo, this._lineMat)
    this.group.add(this._lineMesh)

    // Black outline for the line
    const lineOutlineGeo = new T.BoxGeometry(1, 0.26, 0.03)
    this._lineOutlineMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide })
    this._lineOutlineMesh = new T.Mesh(lineOutlineGeo, this._lineOutlineMat)
    this.group.add(this._lineOutlineMesh)

    // ── Arrowhead — 3x bigger for visibility
    const headGeo = new T.ConeGeometry(0.57, 1.26, 8)
    const headMat = new T.MeshBasicMaterial({ color: 0xFFFF00 })
    this._arrowHead = new T.Mesh(headGeo, headMat)
    this.group.add(this._arrowHead)

    // Black outline
    const outlineGeo = new T.ConeGeometry(0.63, 1.32, 8)
    const outlineMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide })
    this._arrowOutline = new T.Mesh(outlineGeo, outlineMat)
    this.group.add(this._arrowOutline)
  }

  update(startWorld, endWorld) {
    this.group.visible = true

    const T = this.THREE
    const dx = endWorld.x - startWorld.x
    const dy = endWorld.y - startWorld.y
    const len = Math.sqrt(dx * dx + dy * dy) || 0.001

    // Colour by power: white → yellow → orange → red
    const power = Math.min(1, len / 6)
    let r = 1, g = 1, b = 1
    if (power < 0.5) {
      b = 1 - power * 2
    } else {
      g = 1 - (power - 0.5) * 2
      b = 0
    }
    this._lineMat.color.setRGB(r, g, b)

    // ── Position & rotate the thick line box ──────────
    const angle = Math.atan2(dy, dx)
    const midX  = (startWorld.x + endWorld.x) / 2
    const midY  = (startWorld.y + endWorld.y) / 2

    // Rebuild geometry with correct length
    this._lineMesh.geometry.dispose()
    this._lineMesh.geometry = new T.BoxGeometry(len, 0.18, 0.04)
    this._lineMesh.position.set(midX, midY, 0.05)
    this._lineMesh.rotation.z = angle

    this._lineOutlineMesh.geometry.dispose()
    this._lineOutlineMesh.geometry = new T.BoxGeometry(len + 0.04, 0.26, 0.03)
    this._lineOutlineMesh.position.set(midX, midY, 0.04)
    this._lineOutlineMesh.rotation.z = angle

    // ── Arrowhead at END, pointing in drag direction ──
    // Cone default points up (+Y). Rotate to point along drag direction.
    const headAngle = angle - Math.PI / 2  // offset because cone points up
    this._arrowHead.position.set(endWorld.x, endWorld.y, 0.06)
    this._arrowHead.rotation.z = headAngle
    this._arrowOutline.position.copy(this._arrowHead.position)
    this._arrowOutline.rotation.copy(this._arrowHead.rotation)
  }

  hide() {
    this.group.visible = false
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
