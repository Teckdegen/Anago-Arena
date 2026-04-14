import { GAME_CONFIG } from '../config.js'

export class Ball {
  constructor(scene, physicsWorld, THREE, CANNON, owner, color) {
    this.scene = scene
    this.world = physicsWorld
    this.THREE = THREE
    this.CANNON = CANNON
    this.owner = owner
    this.color = color

    this.state = 'attached'   // attached | flying | returning
    this.launchPosition = new THREE.Vector3()

    this._returnSpeed = GAME_CONFIG.BALL_RETURN_SPEED
    this._prevPosition = new THREE.Vector3()
    this._flyTimer = 0

    this._buildMesh()
    this._buildPhysics()
    this._buildTrail()
  }

  _buildMesh() {
    const T = this.THREE
    const geo = new T.SphereGeometry(GAME_CONFIG.BALL_RADIUS, 14, 14)
    const mat = new T.MeshToonMaterial({ color: this.color })
    this.mesh = new T.Mesh(geo, mat)
    this.mesh.castShadow = true
    this.scene.add(this.mesh)

    // Black seam lines
    const seamGeo = new T.TorusGeometry(GAME_CONFIG.BALL_RADIUS + 0.005, 0.008, 4, 20)
    const seamMat = new T.MeshBasicMaterial({ color: 0x000000 })
    const seam1 = new T.Mesh(seamGeo, seamMat)
    const seam2 = new T.Mesh(seamGeo.clone(), seamMat.clone())
    seam2.rotation.y = Math.PI / 2
    this.mesh.add(seam1, seam2)
  }

  _buildPhysics() {
    const CANNON = this.CANNON
    const shape = new CANNON.Sphere(GAME_CONFIG.BALL_RADIUS)
    this.body = new CANNON.Body({
      mass: 0,
      shape,
      material: new CANNON.Material({ restitution: 0.6, friction: 0.3 }),
    })
    this.body.linearDamping = 0.01
    this.body.angularDamping = 0.3
    this.body.type = CANNON.Body.KINEMATIC
    this.world.addBody(this.body)
  }

  _buildTrail() {
    const T = this.THREE
    const radii = [0.13, 0.11, 0.09, 0.07, 0.06, 0.05, 0.04, 0.03]
    const opacities = [0.65, 0.5, 0.38, 0.27, 0.18, 0.12, 0.08, 0.04]

    this.trail = radii.map((r, i) => {
      const geo = new T.SphereGeometry(r, 6, 6)
      const mat = new T.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: opacities[i],
        depthWrite: false,
      })
      const mesh = new T.Mesh(geo, mat)
      mesh.visible = false
      this.scene.add(mesh)
      return { mesh, baseOpacity: opacities[i] }
    })

    this._trailPositions = []
  }

  attachTo(player) {
    this.state = 'attached'
    this.owner = player
    this.body.type = this.CANNON.Body.KINEMATIC
    this.body.mass = 0
    this.body.velocity.setZero()
    this.body.angularVelocity.setZero()
    this._trailPositions = []
    this.trail.forEach(t => { t.mesh.visible = false })
    this._flyTimer = 0
    this._syncToPlayer()
  }

  launch(velocity, levelConfig) {
    this.state = 'flying'
    this.launchPosition.copy(this.owner.position)
    this.body.type = this.CANNON.Body.DYNAMIC
    this.body.mass = 0.6
    this.body.updateMassProperties()
    this.body.velocity.copy(velocity)
    // Add spin
    this.body.angularVelocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    )
    // Apply level-based material
    if (levelConfig && this.body.material) {
      this.body.material.restitution = levelConfig.ballRestitution || 0.6
      this.body.material.friction = levelConfig.ballFriction || 0.2
    }
    this._flyTimer = 0
  }

  returnTo(player) {
    this.state = 'returning'
    this.owner = player
    this.body.type = this.CANNON.Body.KINEMATIC
    this.body.velocity.setZero()
    this.body.angularVelocity.setZero()
  }

  _syncToPlayer() {
    if (!this.owner) return
    const hp = this.owner.handWorldPosition
    this.mesh.position.copy(hp)
    this.body.position.set(hp.x, hp.y, hp.z)
    this.body.quaternion.set(0, 0, 0, 1)
  }

  update(delta) {
    this._prevPosition.copy(this.mesh.position)

    if (this.state === 'attached') {
      this._syncToPlayer()
      this.trail.forEach(t => { t.mesh.visible = false })

    } else if (this.state === 'flying') {
      // Sync mesh from physics
      this.mesh.position.set(
        this.body.position.x,
        this.body.position.y,
        this.body.position.z,
      )
      this.mesh.quaternion.set(
        this.body.quaternion.x,
        this.body.quaternion.y,
        this.body.quaternion.z,
        this.body.quaternion.w,
      )
      this._flyTimer += delta

      // Update trail
      this._trailPositions.unshift(this.mesh.position.clone())
      if (this._trailPositions.length > this.trail.length + 1) {
        this._trailPositions.pop()
      }
      this.trail.forEach((t, i) => {
        const pos = this._trailPositions[i + 1]
        if (pos) {
          t.mesh.position.copy(pos)
          t.mesh.visible = true
        }
      })

    } else if (this.state === 'returning') {
      const target = this.owner.handWorldPosition
      const diff = target.clone().sub(this.mesh.position)
      const dist = diff.length()

      if (dist < 0.3) {
        this.attachTo(this.owner)
      } else {
        const step = Math.min(this._returnSpeed * delta, dist)
        diff.normalize().multiplyScalar(step)
        this.mesh.position.add(diff)
        this.body.position.set(
          this.mesh.position.x,
          this.mesh.position.y,
          this.mesh.position.z
        )
      }
      this.trail.forEach(t => { t.mesh.visible = false })
    }
  }

  get prevPosition() { return this._prevPosition }

  dispose() {
    this.world.removeBody(this.body)
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.trail.forEach(t => {
      this.scene.remove(t.mesh)
      t.mesh.geometry.dispose()
      t.mesh.material.dispose()
    })
  }
}
