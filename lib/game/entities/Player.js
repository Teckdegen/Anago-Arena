import { GAME_CONFIG } from '../config.js'

// French Bulldog-style cartoon character built from Three.js primitives
export class Player {
  constructor(scene, THREE, side, color, username) {
    this.scene = scene
    this.THREE = THREE
    this.side = side          // 'left' | 'right'
    this.color = color        // body color (kept for collar accent)
    this.username = username

    this.position = new THREE.Vector3(
      side === 'left' ? GAME_CONFIG.P1_DEFAULT_X : GAME_CONFIG.P2_DEFAULT_X,
      0, 0
    )
    this.basePosition = this.position.clone()

    this.state = 'holding'
    this.stunned = false
    this.stunTimer = 0
    this.hasBall = true

    this._arcFrom = null
    this._arcTo = null
    this._arcProgress = 0
    this._arcCallback = null
    this._shootTimer = 0
    this._bobTimer = 0
    this._starAngle = 0

    this.group = new THREE.Group()
    this._buildDog()
    this._buildLabel()
    this.scene.add(this.group)

    // Face toward hoop (center)
    this.group.rotation.y = side === 'right' ? Math.PI : 0

    this._sync()
  }

  _toon(hex, opts = {}) {
    return new this.THREE.MeshToonMaterial({ color: hex, ...opts })
  }

  _buildDog() {
    const T = this.THREE

    // ── Palette ────────────────────────────────────
    const BODY_DARK = 0x3D2914   // dark brown body
    const BODY_TAN  = 0xC4956A   // tan markings
    const BELLY     = 0xF5EFE0   // cream belly
    const EAR_PINK  = 0xF4A0A0   // inner ear
    const NOSE      = 0x1A1008   // near black nose
    const EYE_COL   = 0x1A1008
    const COLLAR    = 0xC17A2A   // orange collar
    const TAG_COL   = 0x5C3FA0   // purple tag

    // ── Body ────────────────────────────────────────
    const bodyGeo = new T.CapsuleGeometry(0.22, 0.38, 5, 10)
    this.bodyMesh = new T.Mesh(bodyGeo, this._toon(BODY_DARK))
    this.bodyMesh.position.y = 0.55
    this.bodyMesh.castShadow = true

    // Belly patch (lighter cream on front)
    const bellyGeo = new T.CapsuleGeometry(0.12, 0.22, 4, 8)
    const bellyMesh = new T.Mesh(bellyGeo, this._toon(BELLY))
    bellyMesh.position.set(0, 0.55, 0.14)
    bellyMesh.scale.z = 0.3

    // ── Head ────────────────────────────────────────
    const headGeo = new T.SphereGeometry(0.27, 12, 12)
    this.headMesh = new T.Mesh(headGeo, this._toon(BODY_DARK))
    this.headMesh.position.y = 1.14
    this.headMesh.castShadow = true

    // Head tan markings (spots)
    const spot1 = new T.Mesh(new T.SphereGeometry(0.1, 7, 7), this._toon(BODY_TAN))
    spot1.position.set(0.12, 1.14, 0.14)
    spot1.scale.set(1, 0.6, 0.5)
    const spot2 = new T.Mesh(new T.SphereGeometry(0.07, 7, 7), this._toon(BODY_TAN))
    spot2.position.set(-0.1, 1.08, 0.16)
    spot2.scale.set(1, 0.5, 0.4)

    // ── Snout ───────────────────────────────────────
    const snoutGeo = new T.SphereGeometry(0.14, 10, 10)
    const snoutMesh = new T.Mesh(snoutGeo, this._toon(BODY_TAN))
    snoutMesh.position.set(0, 1.04, 0.22)
    snoutMesh.scale.set(1.1, 0.75, 0.8)

    // Nose
    const noseMesh = new T.Mesh(new T.SphereGeometry(0.07, 8, 8), this._toon(NOSE))
    noseMesh.position.set(0, 1.1, 0.32)
    noseMesh.scale.set(1.2, 0.7, 0.7)

    // Nostrils
    const nostrilL = new T.Mesh(new T.SphereGeometry(0.025, 6, 6), this._toon(0x0A0502))
    nostrilL.position.set(-0.04, 1.09, 0.37)
    const nostrilR = nostrilL.clone()
    nostrilR.position.set(0.04, 1.09, 0.37)

    // ── Eyes (closed happy — dark C shape) ──────────
    // Represent as flat dark arcs using torus with clipping
    const eyeMatL = this._toon(EYE_COL)
    const eyeL = new T.Mesh(new T.TorusGeometry(0.055, 0.022, 5, 10, Math.PI), eyeMatL)
    eyeL.position.set(-0.11, 1.18, 0.25)
    eyeL.rotation.set(0, 0, Math.PI) // arc faces down = closed eyes
    const eyeR = new T.Mesh(new T.TorusGeometry(0.055, 0.022, 5, 10, Math.PI), this._toon(EYE_COL))
    eyeR.position.set(0.11, 1.18, 0.25)
    eyeR.rotation.set(0, 0, Math.PI)

    // ── Ears (large, pointed French Bulldog ears) ────
    const earGeo = new T.ConeGeometry(0.13, 0.28, 5)
    const earL = new T.Mesh(earGeo, this._toon(BODY_DARK))
    earL.position.set(-0.23, 1.38, 0.02)
    earL.rotation.set(0.1, 0.3, -0.25)
    const earR = new T.Mesh(earGeo.clone(), this._toon(BODY_DARK))
    earR.position.set(0.23, 1.38, 0.02)
    earR.rotation.set(0.1, -0.3, 0.25)

    // Inner ear (pink)
    const innerEarGeo = new T.ConeGeometry(0.075, 0.18, 5)
    const innerL = new T.Mesh(innerEarGeo, this._toon(EAR_PINK))
    innerL.position.set(-0.22, 1.39, 0.04)
    innerL.rotation.copy(earL.rotation)
    const innerR = new T.Mesh(innerEarGeo.clone(), this._toon(EAR_PINK))
    innerR.position.set(0.22, 1.39, 0.04)
    innerR.rotation.copy(earR.rotation)

    // ── Arms ────────────────────────────────────────
    const armGeo = new T.CapsuleGeometry(0.075, 0.28, 4, 8)
    this.leftArm = new T.Mesh(armGeo, this._toon(BODY_DARK))
    this.leftArm.position.set(-0.3, 0.62, 0)
    this.leftArm.rotation.z = 0.5

    this.rightArm = new T.Mesh(armGeo.clone(), this._toon(BODY_DARK))
    this.rightArm.position.set(0.3, 0.62, 0)
    this.rightArm.rotation.z = -0.5

    // Tan paw patches on arms
    const pawGeo = new T.SphereGeometry(0.08, 7, 7)
    const pawL = new T.Mesh(pawGeo, this._toon(BODY_TAN))
    pawL.position.set(-0.43, 0.46, 0)
    const pawR = new T.Mesh(pawGeo.clone(), this._toon(BODY_TAN))
    pawR.position.set(0.43, 0.46, 0)

    // Right hand / ball attach point
    this.rightHand = new T.Object3D()
    this.rightHand.position.set(0.5, 0.44, 0)

    // ── Legs ────────────────────────────────────────
    const legGeo = new T.CapsuleGeometry(0.08, 0.28, 4, 8)
    this.legL = new T.Mesh(legGeo, this._toon(BODY_DARK))
    this.legL.position.set(-0.12, 0.18, 0)
    this.legR = new T.Mesh(legGeo.clone(), this._toon(BODY_DARK))
    this.legR.position.set(0.12, 0.18, 0)

    // Paw feet
    const footGeo = new T.SphereGeometry(0.1, 7, 7)
    const footL = new T.Mesh(footGeo, this._toon(BODY_TAN))
    footL.position.set(-0.12, 0.03, 0.04)
    footL.scale.set(1, 0.6, 1.1)
    const footR = new T.Mesh(footGeo.clone(), this._toon(BODY_TAN))
    footR.position.set(0.12, 0.03, 0.04)
    footR.scale.set(1, 0.6, 1.1)

    // ── Collar ──────────────────────────────────────
    const collarGeo = new T.TorusGeometry(0.22, 0.035, 8, 20)
    const collarMesh = new T.Mesh(collarGeo, this._toon(COLLAR))
    collarMesh.position.y = 0.86
    collarMesh.rotation.x = Math.PI / 2

    // Collar buckle
    const buckleGeo = new T.BoxGeometry(0.06, 0.06, 0.04)
    const buckleMesh = new T.Mesh(buckleGeo, this._toon(COLLAR))
    buckleMesh.position.set(0, 0.86, 0.22)

    // Collar tag (purple diamond)
    const tagGeo = new T.BoxGeometry(0.07, 0.07, 0.03)
    const tagMesh = new T.Mesh(tagGeo, this._toon(TAG_COL))
    tagMesh.position.set(0, 0.78, 0.22)
    tagMesh.rotation.z = Math.PI / 4 // diamond orientation
    // White diamond on tag
    const tagMarkGeo = new T.BoxGeometry(0.03, 0.03, 0.04)
    const tagMark = new T.Mesh(tagMarkGeo, this._toon(0xFFFFFF))
    tagMark.position.set(0, 0.78, 0.25)
    tagMark.rotation.z = Math.PI / 4

    // ── Stun stars ───────────────────────────────────
    this.stunStars = []
    const starGeo = new T.SphereGeometry(0.065, 6, 6)
    for (let i = 0; i < 3; i++) {
      const star = new T.Mesh(starGeo.clone(), this._toon(0xFFFF00))
      star.visible = false
      this.stunStars.push(star)
      this.group.add(star)
    }

    // ── Assemble ─────────────────────────────────────
    this.group.add(
      this.bodyMesh, bellyMesh,
      this.headMesh, spot1, spot2,
      snoutMesh, noseMesh, nostrilL, nostrilR,
      eyeL, eyeR,
      earL, earR, innerL, innerR,
      this.leftArm, this.rightArm, pawL, pawR, this.rightHand,
      this.legL, this.legR, footL, footR,
      collarMesh, buckleMesh, tagMesh, tagMark
    )
  }

  _buildLabel() {
    const T = this.THREE
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 52
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'rgba(42,27,94,0.75)'
    ctx.beginPath()
    ctx.roundRect(0, 0, 280, 52, 10)
    ctx.fill()

    ctx.strokeStyle = 'rgba(107,79,187,0.7)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#F0B429'
    ctx.font = 'bold 17px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.username.slice(0, 10), 140, 34)

    const tex = new T.CanvasTexture(canvas)
    const geo = new T.PlaneGeometry(1.6, 0.3)
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    this.label = new T.Mesh(geo, mat)
    this.label.position.set(0, 1.9, 0)
    this.group.add(this.label)
  }

  get handWorldPosition() {
    const wp = new this.THREE.Vector3()
    this.rightHand.getWorldPosition(wp)
    return wp
  }

  _sync() {
    this.group.position.copy(this.position)
  }

  moveTo(targetPos, onComplete) {
    this._arcFrom = this.position.clone()
    this._arcTo = new this.THREE.Vector3(targetPos.x, 0, 0)
    this._arcProgress = 0
    this._arcCallback = onComplete
    this.state = 'repositioning'
  }

  stun() {
    this.stunned = true
    this.stunTimer = GAME_CONFIG.STUN_DURATION
    this.state = 'stunned'
    this.group.traverse(child => {
      if (child.isMesh && child.material?.emissive) {
        child.material.emissive.setHex(0xFF1111)
        child.material.emissiveIntensity = 0.55
      }
    })
    this.stunStars.forEach(s => { s.visible = true })
  }

  _clearStun() {
    this.stunned = false
    this.group.traverse(child => {
      if (child.isMesh && child.material?.emissive) {
        child.material.emissive.setHex(0x000000)
        child.material.emissiveIntensity = 0
      }
    })
    this.stunStars.forEach(s => { s.visible = false })
    this.state = 'waiting'
  }

  shootAnimation() {
    this._shootTimer = 0.38
  }

  update(delta) {
    this._bobTimer += delta

    // Stun
    if (this.stunned) {
      this.stunTimer -= delta
      if (this.stunTimer <= 0) this._clearStun()
      this._starAngle += delta * 4.5
      this.stunStars.forEach((star, i) => {
        const a = this._starAngle + (i * Math.PI * 2 / 3)
        star.position.set(Math.cos(a) * 0.4, 2.0, Math.sin(a) * 0.4)
      })
    }

    // Arc repositioning
    if (this.state === 'repositioning' && this._arcFrom && this._arcTo) {
      this._arcProgress += delta / GAME_CONFIG.ARC_DURATION
      if (this._arcProgress >= 1) {
        this._arcProgress = 1
        this.position.copy(this._arcTo)
        this._sync()
        const cb = this._arcCallback
        this._arcFrom = null
        this._arcTo = null
        this._arcCallback = null
        this.group.rotation.z = 0
        if (cb) cb()
      } else {
        const t = this._arcProgress
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        const dist = this._arcFrom.distanceTo(this._arcTo)
        const arcH = 0.6 + dist * 0.14
        const x = this.THREE.MathUtils.lerp(this._arcFrom.x, this._arcTo.x, t)
        const y = Math.max(0, arcH * Math.sin(Math.PI * ease))
        this.position.set(x, y, 0)
        this._sync()
        this.group.rotation.z = Math.sin(Math.PI * t) * (this.side === 'left' ? -0.28 : 0.28)
      }
    } else if (this.state !== 'repositioning') {
      this.group.rotation.z = 0
    }

    // Idle bob
    if (this.state === 'holding' || this.state === 'waiting') {
      const bob = Math.sin(this._bobTimer * 2.4) * 0.04
      this.bodyMesh.position.y = 0.55 + bob
      this.headMesh.position.y = 1.14 + bob
      this.label.position.y = 1.9 + bob
      // Tail wag (earL/earR slight rotation)
      const wag = Math.sin(this._bobTimer * 5) * 0.12
      if (this.leftArm) this.leftArm.rotation.z = 0.5 + wag
      if (this.rightArm) this.rightArm.rotation.z = -0.5 - wag
    }

    // Shoot arm swing
    if (this._shootTimer > 0) {
      this._shootTimer -= delta
      const prog = Math.max(0, this._shootTimer / 0.38)
      this.rightArm.rotation.z = -0.5 - (1 - prog) * 1.8
      this.rightArm.rotation.x = (1 - prog) * 0.9
    } else {
      this.rightArm.rotation.x = 0
    }

    // Label always faces camera (undo group Y rotation)
    this.label.rotation.y = this.side === 'right' ? Math.PI : 0
  }

  dispose() {
    this.scene.remove(this.group)
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose()
        child.material.dispose()
      }
    })
  }
}
