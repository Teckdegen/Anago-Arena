import { GAME_CONFIG } from '../config.js'

export class Player {
  constructor(scene, THREE, side, color, username) {
    this.scene    = scene
    this.THREE    = THREE
    this.side     = side
    this.color    = color
    this.username = username

    this.position = new THREE.Vector3(
      side === 'left' ? GAME_CONFIG.P1_DEFAULT_X : GAME_CONFIG.P2_DEFAULT_X,
      0, 0
    )
    this.basePosition = this.position.clone()

    this.state        = 'holding'
    this.stunned      = false
    this.stunTimer    = 0
    this.stunImmunity = 0
    this.hasBall      = true

    this._arcFrom     = null
    this._arcTo       = null
    this._arcProgress = 0
    this._arcCallback = null
    this._shootTimer  = 0
    this._bobTimer    = 0
    this._starAngle   = 0
    this._dashing     = false
    this._dashTargetX = undefined
    this._model       = null

    this.group = new THREE.Group()
    this.scene.add(this.group)

    // Stun stars
    this.stunStars = []
    this._buildStunStars()

    // Ball attach point — right hand (in model-local space; X-mirror handles P2 side)
    this.rightHand = new THREE.Object3D()
    this.rightHand.position.set(0.22, 0.72, 0.12)
    this.group.add(this.rightHand)

    // Refs used by animation (populated after model loads or fallback)
    this.bodyMesh  = null
    this.headMesh  = null
    this.leftArm   = null
    this.rightArm  = null

    // Load the GLB
    this._loadGLB()

    // Username label
    this._buildLabel()

    // Mirror P2 on X so both players face the camera (no backward rotation)
    this.group.scale.set(side === 'right' ? -5.0 : 5.0, 5.0, 5.0)

    this._sync()
  }

  // ── GLB loader using dynamic import of three/addons ──────
  async _loadGLB() {
    try {
      // GLTFLoader lives in three/addons in three.js >= 0.160
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()

      loader.load(
        '/base_basic_shaded.glb',
        (gltf) => this._onModelLoaded(gltf.scene),
        undefined,
        (err) => {
          console.warn('GLB load failed, using fallback:', err)
          this._buildFallback()
        }
      )
    } catch {
      // three/addons path not available — try legacy path
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
        const loader = new GLTFLoader()
        loader.load(
          '/base_basic_shaded.glb',
          (gltf) => this._onModelLoaded(gltf.scene),
          undefined,
          () => this._buildFallback()
        )
      } catch {
        this._buildFallback()
      }
    }
  }

  _onModelLoaded(model) {
    const T = this.THREE

    // Auto-scale: fit into 1.5 unit tall bounding box
    const box  = new T.Box3().setFromObject(model)
    const size = new T.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale  = 1.5 / maxDim
    model.scale.setScalar(scale)

    // Sit on floor (Y = 0)
    box.setFromObject(model)
    model.position.y = -box.min.y

    // Shadows + team-colour emissive tint so P1/P2 look different
    const teamHex   = this.color            // e.g. 0x4FC3F7 (P1 blue) or 0xFF8A65 (P2 orange)
    const teamColor = new this.THREE.Color(teamHex)

    model.traverse(child => {
      if (!child.isMesh) return
      child.castShadow    = true
      child.receiveShadow = true

      // Clone so the two players never share material instances
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      const cloned = mats.map(m => {
        const c = m.clone()
        // Subtle emissive glow in the team colour
        if (c.emissive !== undefined) {
          c.emissive.set(teamColor).multiplyScalar(0.22)
          c.emissiveIntensity = 1
        }
        return c
      })
      child.material = Array.isArray(child.material) ? cloned : cloned[0]
    })

    this._model = model
    this.group.add(model)

    // Coloured halo ring at ground level — clear team identifier
    const ringGeo = new T.TorusGeometry(0.38, 0.045, 8, 32)
    const ringMat = new T.MeshBasicMaterial({ color: teamHex, transparent: true, opacity: 0.7 })
    const ring    = new T.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    this.group.add(ring)
    this._teamRing = ring

    // Hand attach point — right side at roughly elbow/hand height
    // size * scale = model dimensions in group-local units (before group.scale of 5)
    this.rightHand.position.set(size.x * scale * 0.42, size.y * scale * 0.42, 0.12)
  }

  // ── Fallback box if GLB fails ─────────────────────────────
  _buildFallback() {
    const T   = this.THREE
    const mat = new T.MeshToonMaterial({ color: this.color || 0x4FC3F7 })

    const body = new T.Mesh(new T.BoxGeometry(0.5, 1.0, 0.4), mat)
    body.position.y = 0.5
    body.castShadow = true
    this.bodyMesh = body
    this.group.add(body)

    const armMat = mat.clone()
    this.rightArm = new T.Mesh(new T.BoxGeometry(0.15, 0.5, 0.15), armMat)
    this.rightArm.position.set(0.35, 0.65, 0)
    this.group.add(this.rightArm)

    this.leftArm = new T.Mesh(new T.BoxGeometry(0.15, 0.5, 0.15), armMat.clone())
    this.leftArm.position.set(-0.35, 0.65, 0)
    this.group.add(this.leftArm)

    this.rightHand.position.set(0.22, 0.40, 0.12)
  }

  _buildStunStars() {
    const T = this.THREE
    for (let i = 0; i < 3; i++) {
      const star = new T.Mesh(
        new T.SphereGeometry(0.065, 6, 6),
        new T.MeshBasicMaterial({ color: 0xFFFF00 })
      )
      star.visible = false
      this.stunStars.push(star)
      this.group.add(star)
    }
  }

  _buildLabel() {
    const T      = this.THREE
    const canvas = document.createElement('canvas')
    canvas.width  = 280
    canvas.height = 52
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(42,27,94,0.75)'
    ctx.beginPath(); ctx.roundRect(0, 0, 280, 52, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(107,79,187,0.7)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#F0B429'
    ctx.font = 'bold 17px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.username.slice(0, 10), 140, 34)

    const tex = new T.CanvasTexture(canvas)
    const geo = new T.PlaneGeometry(1.6, 0.3)
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    this.label = new T.Mesh(geo, mat)
    this.label.position.set(0, 2.0, 0)
    this.group.add(this.label)
  }

  // ── Accessors ─────────────────────────────────────────────
  get handWorldPosition() {
    const wp = new this.THREE.Vector3()
    this.rightHand.getWorldPosition(wp)
    return wp
  }

  _sync() { this.group.position.copy(this.position) }

  // ── Movement ──────────────────────────────────────────────
  moveTo(targetPos, onComplete) {
    this._arcFrom     = this.position.clone()
    this._arcTo       = new this.THREE.Vector3(
      Math.max(-11.5, Math.min(11.5, targetPos.x)), 0, 0)
    this._arcProgress = 0
    this._arcCallback = onComplete
    this.state        = 'repositioning'
  }

  jumpTo(targetPos)    { this.teleportTo(targetPos) }

  teleportTo(targetPos) {
    this._arcFrom     = this.position.clone()
    this._arcTo       = new this.THREE.Vector3(
      Math.max(-11.5, Math.min(11.5, targetPos.x)),
      Math.max(0, targetPos.y || 0), 0)
    this._arcProgress = 0
    this._arcCallback = null
    this._teleporting = true
    this.state        = 'repositioning'
  }

  dashTo(targetPos) {
    this._dashTargetX = Math.max(-11.5, Math.min(11.5, targetPos.x))
    this._dashing     = true
    this.state        = 'repositioning'
  }

  // ── Stun ──────────────────────────────────────────────────
  stun() {
    this.stunned      = true
    this.stunTimer    = GAME_CONFIG.STUN_DURATION
    this.stunImmunity = 10.0
    this.state        = 'stunned'
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

  shootAnimation() { this._shootTimer = 0.38 }

  // ── Update ────────────────────────────────────────────────
  update(delta) {
    this._bobTimer += delta

    // Stun
    if (this.stunned) {
      this.stunTimer -= delta
      if (this.stunTimer <= 0) this._clearStun()
      this._starAngle += delta * 4.5
      this.stunStars.forEach((star, i) => {
        const a = this._starAngle + (i * Math.PI * 2 / 3)
        star.position.set(Math.cos(a) * 0.6, 2.2, Math.sin(a) * 0.6)
      })
    }
    if (this.stunImmunity > 0) this.stunImmunity -= delta

    // Dash
    if (this._dashing && this._dashTargetX !== undefined) {
      const dx = this._dashTargetX - this.position.x
      if (Math.abs(dx) < 0.15) {
        this.position.x   = this._dashTargetX
        this._dashing     = false
        this._dashTargetX = undefined
        if (this.position.y <= 0.01) this.state = 'idle'
      } else {
        this.position.x += Math.sign(dx) * Math.min(18 * delta, Math.abs(dx))
      }
      if (this.position.y > 0)
        this.position.y = Math.max(0, this.position.y - delta * 3.5)
      this._sync()
      this.group.rotation.z = 0
      return
    }

    // Arc / teleport
    if (this.state === 'repositioning' && this._arcFrom && this._arcTo) {
      const speed = this._teleporting ? 8.0 : 1.0
      this._arcProgress += (delta / GAME_CONFIG.ARC_DURATION) * speed

      if (this._arcProgress >= 1) {
        this.position.copy(this._arcTo)
        this._sync()
        const cb         = this._arcCallback
        const onTeleport = this._onTeleportComplete
        this._arcFrom = this._arcTo = this._arcCallback = this._onTeleportComplete = null
        this._teleporting = false
        this.group.rotation.z = 0
        if (cb) cb()
        if (onTeleport) onTeleport()
      } else {
        const t = this._arcProgress
        const yFactor = this._teleporting
          ? Math.sin(Math.PI * t) * 0.3
          : t < 0.3
            ? Math.sin((t / 0.3) * Math.PI * 0.5)
            : Math.cos(((t - 0.3) / 0.7) * Math.PI * 0.5)
        const dist = this._arcFrom.distanceTo(this._arcTo)
        const arcH = this._teleporting ? 0.4 + dist * 0.05 : 1.2 + dist * 0.18
        const xEase = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        this.position.set(
          this.THREE.MathUtils.lerp(this._arcFrom.x, this._arcTo.x, xEase),
          Math.max(0, arcH * yFactor),
          0
        )
        this._sync()
        // Lean forward during jump; flip sign for P2 since scale.x=-1 mirrors rotation direction
        const leanDir = this.side === 'left' ? -1 : 1
        this.group.rotation.z = Math.sin(Math.PI * t) * leanDir * 0.2
      }
    } else if (this.state !== 'repositioning') {
      if (this.position.y > 0) {
        this.position.y = Math.max(0, this.position.y - delta * 3.5)
        this._sync()
      }
      this.group.rotation.z = 0
    }

    // Idle bob
    if (this.state === 'holding' || this.state === 'waiting') {
      const bob = Math.sin(this._bobTimer * 2.4) * 0.04
      if (this._model) this._model.position.y += bob * 0.1
      if (this.label)  this.label.position.y = 2.0 + bob
      if (this.leftArm)  this.leftArm.rotation.z  =  0.5 + Math.sin(this._bobTimer * 5) * 0.12
      if (this.rightArm) this.rightArm.rotation.z = -0.5 - Math.sin(this._bobTimer * 5) * 0.12
    }

    // Shoot animation
    if (this._shootTimer > 0) {
      this._shootTimer -= delta
      const prog = Math.max(0, this._shootTimer / 0.38)
      if (this.rightArm) {
        this.rightArm.rotation.z = -0.5 - (1 - prog) * 1.8
        this.rightArm.rotation.x = (1 - prog) * 0.9
      }
    } else {
      if (this.rightArm) this.rightArm.rotation.x = 0
    }

    // Counter-mirror the label so text stays readable for P2 (group.scale.x = -1 flips it)
    if (this.label) {
      this.label.rotation.y = 0
      this.label.scale.x    = this.side === 'right' ? -1 : 1
    }
  }

  // ── Dispose ───────────────────────────────────────────────
  dispose() {
    this.scene.remove(this.group)
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material?.dispose()
      }
    })
  }
}
