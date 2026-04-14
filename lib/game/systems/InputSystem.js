export class InputSystem {
  constructor(canvas, camera, THREE) {
    this.canvas = canvas
    this.camera = camera
    this.THREE = THREE

    this._isDragging = false
    this._dragStartScreen = { x: 0, y: 0 }
    this._dragCurrentScreen = { x: 0, y: 0 }
    this._pointerDownTime = 0
    this._pointerDownPos = { x: 0, y: 0 }

    this._cbPointerDown = []
    this._cbPointerMove = []
    this._cbPointerUp = []
    this._cbTap = []

    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onTouchStart = this._onTouchStart.bind(this)
    this._onTouchMove = this._onTouchMove.bind(this)
    this._onTouchEnd = this._onTouchEnd.bind(this)

    canvas.addEventListener('mousedown', this._onMouseDown)
    canvas.addEventListener('mousemove', this._onMouseMove)
    canvas.addEventListener('mouseup', this._onMouseUp)
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false })
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false })
  }

  screenToWorld(screenX, screenY, z = 0) {
    const rect = this.canvas.getBoundingClientRect()
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1

    const raycaster = new this.THREE.Raycaster()
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera)

    const plane = new this.THREE.Plane(new this.THREE.Vector3(0, 0, 1), -z)
    const target = new this.THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)
    return target || new this.THREE.Vector3()
  }

  _getScreenPos(e) {
    if (e.touches) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: t.clientX, y: t.clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  _onMouseDown(e) { this._pointerDown(this._getScreenPos(e)) }
  _onMouseMove(e) { this._pointerMove(this._getScreenPos(e)) }
  _onMouseUp(e)   { this._pointerUp(this._getScreenPos(e)) }

  _onTouchStart(e) { e.preventDefault(); this._pointerDown(this._getScreenPos(e)) }
  _onTouchMove(e)  { e.preventDefault(); this._pointerMove(this._getScreenPos(e)) }
  _onTouchEnd(e)   { e.preventDefault(); this._pointerUp(this._getScreenPos(e)) }

  _pointerDown(screen) {
    this._isDragging = false
    this._dragStartScreen = { ...screen }
    this._dragCurrentScreen = { ...screen }
    this._pointerDownTime = Date.now()
    this._pointerDownPos = { ...screen }

    const world = this.screenToWorld(screen.x, screen.y)
    this._cbPointerDown.forEach(cb => cb(world, screen))
  }

  _pointerMove(screen) {
    this._dragCurrentScreen = { ...screen }
    const dx = screen.x - this._dragStartScreen.x
    const dy = screen.y - this._dragStartScreen.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 12) this._isDragging = true

    const world = this.screenToWorld(screen.x, screen.y)
    const startWorld = this.screenToWorld(this._dragStartScreen.x, this._dragStartScreen.y)
    this._cbPointerMove.forEach(cb => cb(world, screen, { startWorld, startScreen: this._dragStartScreen }))
  }

  _pointerUp(screen) {
    const world = this.screenToWorld(screen.x, screen.y)
    const startWorld = this.screenToWorld(this._dragStartScreen.x, this._dragStartScreen.y)
    const dx = screen.x - this._dragStartScreen.x
    const dy = screen.y - this._dragStartScreen.y
    const dragDist = Math.sqrt(dx * dx + dy * dy)
    const elapsed = Date.now() - this._pointerDownTime

    this._cbPointerUp.forEach(cb => cb(world, screen, this._isDragging, {
      startWorld,
      dragVector: { x: dx, y: dy },
      dragDist,
    }))

    // Fire tap if minimal movement and quick
    if (dragDist < 22 && elapsed < 400 && !this._isDragging) {
      this._cbTap.forEach(cb => cb(world, screen))
    }

    this._isDragging = false
  }

  onPointerDown(cb) { this._cbPointerDown.push(cb) }
  onPointerMove(cb) { this._cbPointerMove.push(cb) }
  onPointerUp(cb)   { this._cbPointerUp.push(cb) }
  onTap(cb)         { this._cbTap.push(cb) }

  // Clear all callbacks (call before re-binding)
  clearCallbacks() {
    this._cbPointerDown = []
    this._cbPointerMove = []
    this._cbPointerUp   = []
    this._cbTap         = []
  }

  update() {}

  dispose() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown)
    this.canvas.removeEventListener('mousemove', this._onMouseMove)
    this.canvas.removeEventListener('mouseup', this._onMouseUp)
    this.canvas.removeEventListener('touchstart', this._onTouchStart)
    this.canvas.removeEventListener('touchmove', this._onTouchMove)
    this.canvas.removeEventListener('touchend', this._onTouchEnd)
  }
}
