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

    // ── Line — same visual weight as arrowhead ────────
    const lineGeo = new T.BufferGeometry()
    lineGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3))
    this._line = new T.Line(lineGeo, new T.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: false,
      linewidth: 3,
    }))
    this.group.add(this._line)

    // ── Arrowhead — 2.5x size of player hand (~0.08 units hand)
    // So arrowhead radius = 0.19, height = 0.42
    const headGeo = new T.ConeGeometry(0.19, 0.42, 8)
    const headMat = new T.MeshBasicMaterial({ color: 0xFFFF00 })
    this._arrowHead = new T.Mesh(headGeo, headMat)
    this.group.add(this._arrowHead)

    // Black outline
    const outlineGeo = new T.ConeGeometry(0.21, 0.44, 8)
    const outlineMat = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide })
    this._arrowOutline = new T.Mesh(outlineGeo, outlineMat)
    this.group.add(this._arrowOutline)
  }

  update(startWorld, endWorld) {
    this.group.visible = true

    const dx = endWorld.x - startWorld.x
    const dy = endWorld.y - startWorld.y
    const len = Math.sqrt(dx * dx + dy * dy) || 0.001

    // ── Straight line ─────────────────────────────────
    const lp = this._line.geometry.attributes.position.array
    lp[0] = startWorld.x; lp[1] = startWorld.y; lp[2] = 0.05
    lp[3] = endWorld.x;   lp[4] = endWorld.y;   lp[5] = 0.05
    this._line.geometry.attributes.position.needsUpdate = true

    // Colour by power: white → yellow → orange → red
    const power = Math.min(1, len / 6)
    if (power < 0.5) {
      this._line.material.color.setRGB(1, 1, 1 - power * 2)
    } else {
      this._line.material.color.setRGB(1, 1 - (power - 0.5) * 2, 0)
    }

    // ── Arrowhead at END, pointing in drag direction ──
    // Cone default points up (+Y). Rotate to point along drag direction.
    const angle = Math.atan2(dy, dx) - Math.PI / 2  // offset because cone points up
    this._arrowHead.position.set(endWorld.x, endWorld.y, 0.06)
    this._arrowHead.rotation.z = angle
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
