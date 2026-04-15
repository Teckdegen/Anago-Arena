export class DragArrow {
  constructor(scene, THREE) {
    this.scene = scene
    this.THREE = THREE
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)

    this._dots = []
    this._arcLine = null
    this._buildArcLine()
    this._buildDots()
  }

  _buildArcLine() {
    const T = this.THREE
    // Arc line — up to 30 points for smooth curve
    const count = 30
    const positions = new Float32Array(count * 3)
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.BufferAttribute(positions, 3))
    geo.setDrawRange(0, 0)

    const mat = new T.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    })
    this._arcLine = new T.Line(geo, mat)
    this.group.add(this._arcLine)

    // Arrowhead at end
    const headGeo = new T.BufferGeometry()
    headGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3))
    const headMat = new T.LineBasicMaterial({ color: 0xFFFF00 })
    this._arrowHead = new T.Line(headGeo, headMat)
    this.group.add(this._arrowHead)
  }

  _buildDots() {
    const T = this.THREE
    // Power indicator dots along the arc
    for (let i = 0; i < 10; i++) {
      const size = 0.08 - i * 0.005
      const geo  = new T.SphereGeometry(Math.max(0.03, size), 6, 6)
      const mat  = new T.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 1 - i * 0.09,
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

    // Launch velocity (same formula as TurnManager)
    const vx = dx * 0.5 * power
    const vy = Math.abs(dy) * 0.5 * power + power * 0.45

    // ── Build curved arc ──────────────────────────────
    const steps    = 30
    const timeStep = 0.08
    const positions = this._arcLine.geometry.attributes.position.array

    let validPoints = 0
    let lastX = startWorld.x, lastY = startWorld.y

    for (let i = 0; i < steps; i++) {
      const t  = (i + 1) * timeStep
      const px = startWorld.x + vx * t
      const py = startWorld.y + vy * t - 0.5 * gravity * t * t

      // Stop drawing arc once it goes below ground
      if (py < -0.5) break

      positions[i * 3 + 0] = px
      positions[i * 3 + 1] = py
      positions[i * 3 + 2] = 0.05

      lastX = px
      lastY = py
      validPoints++
    }

    this._arcLine.geometry.setDrawRange(0, validPoints)
    this._arcLine.geometry.attributes.position.needsUpdate = true

    // Colour arc by power: green → yellow → red
    if (ratio < 0.5) {
      this._arcLine.material.color.setRGB(ratio * 2, 1, 0.2)
    } else {
      this._arcLine.material.color.setRGB(1, 1 - (ratio - 0.5) * 2, 0.2)
    }

    // ── Arrowhead at end of arc ───────────────────────
    if (validPoints > 1) {
      const prevX = positions[(validPoints - 2) * 3]
      const prevY = positions[(validPoints - 2) * 3 + 1]
      const angle = Math.atan2(lastY - prevY, lastX - prevX)
      const hs    = 0.28
      const ha    = this._arrowHead.geometry.attributes.position.array
      ha[0] = lastX; ha[1] = lastY; ha[2] = 0.05
      ha[3] = lastX + Math.cos(angle + 2.5) * hs
      ha[4] = lastY + Math.sin(angle + 2.5) * hs
      ha[5] = 0.05
      this._arrowHead.geometry.attributes.position.needsUpdate = true
    }

    // ── Dots evenly spaced along arc ─────────────────
    const dotSpacing = Math.max(1, Math.floor(validPoints / this._dots.length))
    this._dots.forEach((d, i) => {
      const idx = Math.min((i + 1) * dotSpacing, validPoints - 1)
      if (idx >= 0 && idx < validPoints) {
        d.mesh.position.set(
          positions[idx * 3],
          positions[idx * 3 + 1],
          0.08
        )
        d.mesh.visible = true
        d.mat.opacity  = Math.max(0, 0.9 - i * 0.09)
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
