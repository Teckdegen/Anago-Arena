export class GameScene {
  constructor(scene, renderer, THREE) {
    this.scene = scene
    this.renderer = renderer
    this.THREE = THREE
    this.clouds = []
    this.particles = []       // score burst particles
    this.weather = []         // seasonal weather particles
    this.theme = null
    this._bgMesh = null
    this._skyGradientCanvas = null
    this._skyTex = null
  }

  setup(levelConfig, courtH) {
    this.theme = levelConfig.courtTheme
    this._courtH = courtH || 32
    this._applyThemeLighting()
    this._buildBackground()
    this._buildClouds()
    this._buildWeather()
  }

  _applyThemeLighting() {
    const THREE = this.THREE
    const theme = this.theme
    const isNight = theme.season === 'night'

    this.renderer.setClearColor(theme.bg)
    // Remove old lights
    if (this.hemiLight) this.scene.remove(this.hemiLight)
    if (this.dirLight)  this.scene.remove(this.dirLight)
    if (this.rimLight)  this.scene.remove(this.rimLight)

    this.hemiLight = new THREE.HemisphereLight(
      isNight ? 0x1A1A3E : theme.sky,
      isNight ? 0x0A0A1A : theme.floor,
      isNight ? 0.6 : 0.9
    )
    this.scene.add(this.hemiLight)

    this.dirLight = new THREE.DirectionalLight(
      isNight ? 0x8888FF : 0xFFD49A,
      isNight ? 0.7 : 1.3
    )
    this.dirLight.position.set(5, 8, 3)
    this.dirLight.castShadow = true
    this.dirLight.shadow.mapSize.width  = 1024
    this.dirLight.shadow.mapSize.height = 1024
    this.dirLight.shadow.camera.near = 0.5
    this.dirLight.shadow.camera.far  = 50
    this.dirLight.shadow.camera.left   = -12
    this.dirLight.shadow.camera.right  = 12
    this.dirLight.shadow.camera.top    = 12
    this.dirLight.shadow.camera.bottom = -4
    this.scene.add(this.dirLight)

    this.rimLight = new THREE.DirectionalLight(
      isNight ? 0x4444AA : 0x8B6FDB,
      0.4
    )
    this.rimLight.position.set(-4, 5, -6)
    this.scene.add(this.rimLight)
  }

  _buildBackground() {
    const THREE = this.THREE
    const theme = this.theme

    // Remove old bg
    if (this._bgMesh) {
      this.scene.remove(this._bgMesh)
      this._bgMesh.geometry.dispose()
      this._bgMesh.material.dispose()
    }
    if (this._skyTex) this._skyTex.dispose()

    // Sky gradient canvas — matches the screenshot's light blue sky
    const canvas = document.createElement('canvas')
    canvas.width  = 4
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, 256)

    const topHex    = '#' + (theme.sky    || 0x87CEEB).toString(16).padStart(6, '0')
    const bottomHex = '#' + (theme.skyBot || 0xD6EAF8).toString(16).padStart(6, '0')
    grad.addColorStop(0,    topHex)
    grad.addColorStop(0.65, bottomHex)
    grad.addColorStop(1,    bottomHex)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 4, 256)

    this._skyTex = new THREE.CanvasTexture(canvas)
    const bgGeo = new THREE.PlaneGeometry(200, 200)
    const bgMat = new THREE.MeshBasicMaterial({ map: this._skyTex, depthWrite: false })
    this._bgMesh = new THREE.Mesh(bgGeo, bgMat)
    this._bgMesh.position.set(0, (this._courtH || 32) / 2, -5)
    this._bgMesh.renderOrder = -1
    this.scene.add(this._bgMesh)

    // Distant hills / mountains silhouette (like the screenshot)
    this._buildHills()
  }

  _buildHills() {
    const THREE = this.THREE
    const theme = this.theme

    // Remove old hills
    if (this._hills) {
      this._hills.forEach(h => {
        this.scene.remove(h)
        h.geometry.dispose()
        h.material.dispose()
      })
    }
    this._hills = []

    const isNight = theme.season === 'night'
    const hillColor = isNight ? 0x1A1A3E : this._blendColor(theme.skyBot || 0xD6EAF8, 0x888888, 0.35)

    // Two layers of hills for depth
    // Hills sit just above the floor, in the lower ~15% of the court
    const base = (this._courtH || 32) * 0.10
    const hillData = [
      { x: -5,  y: base + 2.0, z: -3.8, rx: 4.5, ry: 2.0 },
      { x:  0,  y: base + 1.5, z: -3.8, rx: 5.0, ry: 1.8 },
      { x:  5,  y: base + 2.2, z: -3.8, rx: 4.0, ry: 1.9 },
      { x: -8,  y: base + 1.0, z: -3.6, rx: 3.5, ry: 1.5 },
      { x:  8,  y: base + 1.5, z: -3.6, rx: 3.8, ry: 1.6 },
    ]

    hillData.forEach(d => {
      const geo = new THREE.SphereGeometry(1, 12, 8)
      const mat = new THREE.MeshBasicMaterial({ color: hillColor, transparent: true, opacity: 0.55 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(d.x, d.y, d.z)
      mesh.scale.set(d.rx, d.ry, 1)
      this.scene.add(mesh)
      this._hills.push(mesh)
    })
  }

  _blendColor(hex1, hex2, t) {
    const r1 = (hex1 >> 16) & 0xFF, g1 = (hex1 >> 8) & 0xFF, b1 = hex1 & 0xFF
    const r2 = (hex2 >> 16) & 0xFF, g2 = (hex2 >> 8) & 0xFF, b2 = hex2 & 0xFF
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return (r << 16) | (g << 8) | b
  }

  _buildClouds() {
    const THREE = this.THREE

    // Remove old clouds
    this.clouds.forEach(c => {
      this.scene.remove(c)
      c.geometry?.dispose()
      c.material?.dispose()
    })
    this.clouds = []

    const theme = this.theme
    const isNight = theme.season === 'night'
    if (isNight) return  // no clouds at night

    const cloudColor = theme.clouds || 0xFFFFFF

    // Fluffy cloud groups — each cloud = 3-4 overlapping spheres
    const ch = this._courtH || 32
    const cloudGroups = [
      { cx: -6,  cy: ch * 0.75, z: -3.5, speed: 0.28 },
      { cx:  1,  cy: ch * 0.85, z: -3.5, speed: 0.22 },
      { cx:  6,  cy: ch * 0.70, z: -3.5, speed: 0.32 },
      { cx: -1,  cy: ch * 0.80, z: -3.5, speed: 0.18 },
    ]

    cloudGroups.forEach(cg => {
      const puffs = [
        { ox: 0,    oy: 0,    r: 0.55 },
        { ox: 0.5,  oy: 0.1,  r: 0.45 },
        { ox: -0.5, oy: 0.05, r: 0.42 },
        { ox: 0.25, oy: 0.25, r: 0.35 },
      ]

      const group = new THREE.Group()
      group.position.set(cg.cx, cg.cy, cg.z)
      group.userData.speed = cg.speed

      puffs.forEach(p => {
        const geo = new THREE.SphereGeometry(p.r, 8, 6)
        const mat = new THREE.MeshBasicMaterial({
          color: cloudColor,
          transparent: true,
          opacity: 0.82,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(p.ox, p.oy, 0)
        group.add(mesh)
      })

      this.scene.add(group)
      this.clouds.push(group)
    })
  }

  // ── Seasonal weather particles ──────────────────────────────────────────────
  _buildWeather() {
    const THREE = this.THREE
    const season = this.theme?.season || 'summer'
    const ch = this._courtH || 32
    const hw = 12  // half court width

    // Clear old weather
    this._clearWeather()

    const configs = {
      winter: {
        count: 55,
        colors: [0xFFFFFF, 0xD6EAF8, 0xAED6F1, 0xEBF5FB],
        size: [0.06, 0.12],
        speedY: [1.0, 2.5],
        drift: 0.4,       // horizontal sway
        opacity: [0.55, 0.85],
        spin: false,
      },
      spring: {
        count: 35,
        colors: [0xFFB7C5, 0xFFD1DC, 0xFF9AAD, 0xFFC4D4, 0xFFF0F5],
        size: [0.07, 0.14],
        speedY: [0.7, 1.8],
        drift: 0.9,
        opacity: [0.5, 0.8],
        spin: true,
      },
      autumn: {
        count: 40,
        colors: [0xE74C3C, 0xE67E22, 0xF0B429, 0xD35400, 0xC0392B],
        size: [0.08, 0.15],
        speedY: [1.2, 2.8],
        drift: 0.7,
        opacity: [0.6, 0.9],
        spin: true,
      },
      night: {
        count: 60,
        colors: [0xFFFFFF, 0xD6EAF8, 0xAED6F1],
        size: [0.03, 0.07],
        speedY: [0.0, 0.0],   // stars are static
        drift: 0.0,
        opacity: [0.4, 0.9],
        spin: false,
        static: true,
      },
      summer: { count: 0 },  // clear sky — no particles
    }

    const cfg = configs[season] || configs.summer
    if (!cfg.count) return

    for (let i = 0; i < cfg.count; i++) {
      const r = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0])
      const geo = new THREE.SphereGeometry(r, 5, 4)
      const col = cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: cfg.opacity[0] + Math.random() * (cfg.opacity[1] - cfg.opacity[0]),
      })
      const mesh = new THREE.Mesh(geo, mat)

      // Spread across the court
      const startY = cfg.static
        ? Math.random() * ch                  // stars: random height
        : ch * 0.2 + Math.random() * ch * 0.8  // falling: start in upper 80%

      mesh.position.set(
        -hw + Math.random() * hw * 2,
        startY,
        -2.5 + Math.random() * 0.5,
      )
      mesh.userData = {
        speedY:  cfg.speedY[0] + Math.random() * (cfg.speedY[1] - cfg.speedY[0]),
        drift:   (Math.random() - 0.5) * 2 * cfg.drift,
        driftFreq: 0.5 + Math.random() * 1.5,
        phase:   Math.random() * Math.PI * 2,
        spin:    cfg.spin,
        spinSpd: (Math.random() - 0.5) * 3,
        static:  cfg.static || false,
        baseOpacity: mat.opacity,
      }

      this.scene.add(mesh)
      this.weather.push(mesh)
    }
  }

  _clearWeather() {
    this.weather.forEach(m => {
      this.scene.remove(m)
      m.geometry?.dispose()
      m.material?.dispose()
    })
    this.weather = []
  }

  updateTheme(levelConfig) {
    this.theme = levelConfig.courtTheme
    this._applyThemeLighting()
    this._buildBackground()
    this._buildClouds()
    this._buildWeather()
  }

  addScoreParticles(position, color = 0xF0B429) {
    const THREE = this.THREE
    const colors = [0xF0B429, 0xFF6B35, 0xC4956A, 0xFFFFFF, 0x8B6FDB, 0xFF4081]
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.SphereGeometry(0.065, 6, 6)
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(position)
      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5.5 + 2,
        (Math.random() - 0.5) * 0.4,
      )
      mesh.userData.life = 1.0
      this.scene.add(mesh)
      this.particles.push(mesh)
    }
  }

  update(delta) {
    const ch = this._courtH || 32
    const hw = 12

    // Cloud drift
    this.clouds.forEach(cloud => {
      cloud.position.x -= cloud.userData.speed * delta
      if (cloud.position.x < -14) cloud.position.x = 14
    })

    // Seasonal weather
    const t = performance.now() / 1000
    this.weather.forEach(m => {
      if (m.userData.static) return   // stars don't move
      const d = m.userData

      // Fall down
      m.position.y -= d.speedY * delta

      // Horizontal sway (sin wave)
      m.position.x += Math.sin(t * d.driftFreq + d.phase) * d.drift * delta

      // Spin
      if (d.spin) {
        m.rotation.z += d.spinSpd * delta
        m.rotation.x += d.spinSpd * 0.5 * delta
      }

      // Clamp X within court
      if (m.position.x < -hw) m.position.x = -hw
      if (m.position.x >  hw) m.position.x =  hw

      // Reset to top when falling off bottom
      if (m.position.y < -0.5) {
        m.position.y = ch + Math.random() * 2
        m.position.x = -hw + Math.random() * hw * 2
      }
    })

    // Score burst particles
    this.particles = this.particles.filter(p => {
      p.userData.life -= delta * 1.3
      p.material.opacity = p.userData.life
      p.position.addScaledVector(p.userData.vel, delta)
      p.userData.vel.y -= 7 * delta
      if (p.userData.life <= 0) {
        this.scene.remove(p)
        p.geometry.dispose()
        p.material.dispose()
        return false
      }
      return true
    })
  }

  dispose() {
    this._clearWeather()
    this.clouds.forEach(c => {
      this.scene.remove(c)
      c.traverse(child => {
        if (child.isMesh) { child.geometry.dispose(); child.material.dispose() }
      })
    })
    this.particles.forEach(p => {
      this.scene.remove(p)
      p.geometry.dispose()
      p.material.dispose()
    })
    if (this._bgMesh) {
      this.scene.remove(this._bgMesh)
      this._bgMesh.geometry.dispose()
      this._bgMesh.material.dispose()
    }
    if (this._skyTex) this._skyTex.dispose()
    if (this._hills) {
      this._hills.forEach(h => {
        this.scene.remove(h)
        h.geometry.dispose()
        h.material.dispose()
      })
    }
  }
}
