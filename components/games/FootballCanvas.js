/**
 * Head Ball — 1v1 side-view football like Head Ball 2
 * Big dog heads, goals on left/right walls, physics ball
 * Button controls: ← → move, ↑ jump, A = kick/power
 * First to 5 goals wins, 90 second timer
 */
import { useEffect, useRef } from 'react'

const GRAVITY    = 0.55
const JUMP_V     = -16
const MOVE_SPD   = 4.5
const BALL_R     = 18
const DOG_R      = 32
const WIN_GOALS  = 5
const GAME_SEC   = 90
const GOAL_H_PCT = 0.38   // goal height as fraction of screen height

export default function FootballCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height

    const FLOOR   = CH - 90
    const CEILING = 55
    const GOAL_H  = CH * GOAL_H_PCT
    const GOAL_W  = 22
    const GOAL_Y  = FLOOR - GOAL_H
    const MID_X   = CW / 2

    const isPVP = config?.mode === 'pvp'

    // ── Players ──────────────────────────────────────────────────────────────
    const p1 = {
      x: CW * 0.22, y: FLOOR - DOG_R,
      vx: 0, vy: 0, onGround: true,
      color: '#C17A2A', kColor: '#8B5010',
      name: 'YOU', side: 'left',
      maxX: MID_X - DOG_R - 4,
      minX: GOAL_W + DOG_R,
      power: false, powerTimer: 0,
    }
    const p2 = {
      x: CW * 0.78, y: FLOOR - DOG_R,
      vx: 0, vy: 0, onGround: true,
      color: '#5B3FDB', kColor: '#3A2490',
      name: isPVP ? (config?.opponent || 'P2') : 'AI',
      side: 'right',
      maxX: CW - GOAL_W - DOG_R,
      minX: MID_X + DOG_R + 4,
      power: false, powerTimer: 0,
    }

    // ── Ball ─────────────────────────────────────────────────────────────────
    const ball = { x: MID_X, y: CH * 0.3, vx: 2, vy: -3, spin: 0 }

    // ── State ─────────────────────────────────────────────────────────────────
    let scores   = [0, 0]
    let timeLeft = GAME_SEC
    let gameOver = false
    let lastTime = performance.now()
    let goalFlash = 0, goalFlashSide = 0

    // ── Input (button state) ──────────────────────────────────────────────────
    const keys = { left: false, right: false, up: false, a: false }
    // Touch button areas (set after first draw)
    const BTN = {}

    function getPos(e) {
      const r = canvas.getBoundingClientRect()
      const s = e.touches ? e.touches[0] : e
      return { x: (s.clientX - r.left) * (CW / r.width), y: (s.clientY - r.top) * (CH / r.height) }
    }

    function inBtn(pos, btn) {
      if (!BTN[btn]) return false
      const b = BTN[btn]
      return pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h
    }

    const activeTouches = {}

    function onTouchStart(e) {
      e.preventDefault()
      for (const t of e.changedTouches) {
        const pos = { x: (t.clientX - canvas.getBoundingClientRect().left) * (CW / canvas.getBoundingClientRect().width), y: (t.clientY - canvas.getBoundingClientRect().top) * (CH / canvas.getBoundingClientRect().height) }
        if (inBtn(pos, 'left'))  { keys.left  = true; activeTouches[t.identifier] = 'left' }
        if (inBtn(pos, 'right')) { keys.right = true; activeTouches[t.identifier] = 'right' }
        if (inBtn(pos, 'up'))    { keys.up    = true; activeTouches[t.identifier] = 'up' }
        if (inBtn(pos, 'a'))     { keys.a     = true; activeTouches[t.identifier] = 'a' }
      }
    }
    function onTouchEnd(e) {
      e.preventDefault()
      for (const t of e.changedTouches) {
        const k = activeTouches[t.identifier]
        if (k) { keys[k] = false; delete activeTouches[t.identifier] }
      }
    }

    // Keyboard fallback
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft')  keys.left  = true
      if (e.key === 'ArrowRight') keys.right = true
      if (e.key === 'ArrowUp')    keys.up    = true
      if (e.key === 'a' || e.key === 'A') keys.a = true
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowLeft')  keys.left  = false
      if (e.key === 'ArrowRight') keys.right = false
      if (e.key === 'ArrowUp')    keys.up    = false
      if (e.key === 'a' || e.key === 'A') keys.a = false
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── AI ────────────────────────────────────────────────────────────────────
    let aiTimer = 0
    function updateAI(delta) {
      if (isPVP) return
      aiTimer += delta
      if (aiTimer < 0.12) return
      aiTimer = 0

      // Move toward ball
      const dx = ball.x - p2.x
      if (Math.abs(dx) > 8) p2.vx = Math.sign(dx) * MOVE_SPD * 0.9
      else p2.vx = 0

      // Jump when ball is above
      if (ball.y < p2.y - 20 && p2.onGround && Math.abs(ball.x - p2.x) < 150) {
        p2.vy = JUMP_V
        p2.onGround = false
      }

      // Power kick when close
      if (Math.hypot(ball.x - p2.x, ball.y - p2.y) < DOG_R + BALL_R + 10) {
        p2.power = true
        p2.powerTimer = 0.15
      }
    }

    // ── Physics ───────────────────────────────────────────────────────────────
    function updatePlayer(p, delta) {
      p.vy += GRAVITY
      p.x  += p.vx
      p.y  += p.vy
      p.vx *= 0.82

      if (p.y + DOG_R >= FLOOR) {
        p.y = FLOOR - DOG_R; p.vy = 0; p.onGround = true
      }
      if (p.y - DOG_R <= CEILING) {
        p.y = CEILING + DOG_R; p.vy *= -0.4
      }
      p.x = Math.max(p.minX, Math.min(p.maxX, p.x))

      if (p.powerTimer > 0) {
        p.powerTimer -= delta
        if (p.powerTimer <= 0) p.power = false
      }
    }

    function updateBall() {
      ball.vy += GRAVITY * 0.88
      ball.x  += ball.vx
      ball.y  += ball.vy
      ball.vx *= 0.992
      ball.spin += ball.vx * 0.05

      // Floor bounce
      if (ball.y + BALL_R >= FLOOR) {
        ball.y = FLOOR - BALL_R
        ball.vy *= -0.68
        ball.vx *= 0.85
        if (Math.abs(ball.vy) < 1.5) ball.vy = -1.5
      }
      // Ceiling
      if (ball.y - BALL_R <= CEILING) {
        ball.y = CEILING + BALL_R; ball.vy *= -0.55
      }

      // Left wall / goal
      if (ball.x - BALL_R <= GOAL_W) {
        if (ball.y > GOAL_Y) { doGoal(1); return }  // right team scores
        ball.x = GOAL_W + BALL_R; ball.vx *= -0.65
      }
      // Right wall / goal
      if (ball.x + BALL_R >= CW - GOAL_W) {
        if (ball.y > GOAL_Y) { doGoal(0); return }  // left team scores
        ball.x = CW - GOAL_W - BALL_R; ball.vx *= -0.65
      }

      // Player-ball collision
      for (const p of [p1, p2]) {
        const dx = ball.x - p.x, dy = ball.y - p.y
        const dd = Math.hypot(dx, dy)
        const minD = DOG_R + BALL_R
        if (dd < minD && dd > 0) {
          const nx = dx/dd, ny = dy/dd
          const rv = (ball.vx - p.vx)*nx + (ball.vy - p.vy)*ny
          if (rv < 0) {
            const imp = -rv * (p.power ? 2.2 : 1.6)
            ball.vx += nx * imp; ball.vy += ny * imp - (p.power ? 3 : 1)
          }
          const ov = minD - dd
          ball.x += nx * ov; ball.y += ny * ov
        }
      }
    }

    function doGoal(scorerIdx) {
      scores[scorerIdx]++
      goalFlash = 1.8; goalFlashSide = scorerIdx
      window.ANAGO_UI?.updateScore(scores[0], scores[1])
      if (scores[scorerIdx] >= WIN_GOALS) {
        gameOver = true
        window.ANAGO_UI?.showResult(scorerIdx, [...scores])
        return
      }
      resetBall()
    }

    function resetBall() {
      ball.x = MID_X; ball.y = CH * 0.3
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * 2.5
      ball.vy = -4; ball.spin = 0
    }

    // ── Draw ──────────────────────────────────────────────────────────────────
    function drawBackground() {
      // Stadium gradient sky
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#1a1a2e')
      grad.addColorStop(0.5, '#16213e')
      grad.addColorStop(1, '#0f3460')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)

      // Crowd silhouette
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      for (let i = 0; i < 40; i++) {
        const cx = (i / 40) * CW
        const cy = 20 + Math.sin(i * 1.3) * 12
        ctx.beginPath(); ctx.arc(cx, cy, 8 + Math.sin(i) * 3, 0, Math.PI*2); ctx.fill()
      }

      // Pitch
      ctx.fillStyle = '#2d8a2d'
      ctx.fillRect(0, CEILING, CW, FLOOR - CEILING)

      // Pitch stripes
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      for (let i = 0; i < 8; i += 2) {
        ctx.fillRect(i * CW/8, CEILING, CW/8, FLOOR - CEILING)
      }

      // Ground line
      ctx.fillStyle = '#1a6b1a'
      ctx.fillRect(0, FLOOR, CW, CH - FLOOR)

      // White lines
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(MID_X, CEILING); ctx.lineTo(MID_X, FLOOR); ctx.stroke()
      ctx.beginPath(); ctx.arc(MID_X, FLOOR, 55, Math.PI, 0); ctx.stroke()
      ctx.beginPath(); ctx.arc(MID_X, FLOOR, 4, 0, Math.PI*2); ctx.fill()
    }

    function drawGoals() {
      // Left goal (amber)
      ctx.fillStyle = 'rgba(193,122,42,0.3)'
      ctx.fillRect(0, GOAL_Y, GOAL_W, GOAL_H)
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3
      ctx.strokeRect(0, GOAL_Y, GOAL_W, GOAL_H)
      // Net
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(0, GOAL_Y + GOAL_H*i/5); ctx.lineTo(GOAL_W, GOAL_Y + GOAL_H*i/5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(GOAL_W*i/4, GOAL_Y); ctx.lineTo(GOAL_W*i/4, FLOOR); ctx.stroke()
      }

      // Right goal (purple)
      ctx.fillStyle = 'rgba(91,63,219,0.3)'
      ctx.fillRect(CW - GOAL_W, GOAL_Y, GOAL_W, GOAL_H)
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3
      ctx.strokeRect(CW - GOAL_W, GOAL_Y, GOAL_W, GOAL_H)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(CW - GOAL_W, GOAL_Y + GOAL_H*i/5); ctx.lineTo(CW, GOAL_Y + GOAL_H*i/5); ctx.stroke()
      }
    }

    function drawDog(p) {
      ctx.save(); ctx.translate(p.x, p.y)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath(); ctx.ellipse(0, DOG_R + 4, DOG_R*0.8, 7, 0, 0, Math.PI*2); ctx.fill()

      // Power glow
      if (p.power) {
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(0, 0, DOG_R + 8, 0, Math.PI*2); ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Body (big head style — head IS the body)
      ctx.fillStyle = p.color; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, DOG_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Tan face marking
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(6, 4, DOG_R*0.45, DOG_R*0.38, 0.3, 0, Math.PI*2); ctx.fill()

      // Ears
      ctx.fillStyle = p.color; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.72, -DOG_R*0.72, 7, 13, -0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.72, -DOG_R*0.72, 7, 13,  0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#F4A0A0'
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.7, -DOG_R*0.7, 4, 8, -0.4, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.7, -DOG_R*0.7, 4, 8,  0.4, 0, Math.PI*2); ctx.fill()

      // Eyes
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(-10, -8, 5, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc( 10, -8, 5, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#FFF'
      ctx.beginPath(); ctx.arc(-8, -10, 2, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(12, -10, 2, 0, Math.PI*2); ctx.fill()

      // Snout
      ctx.fillStyle = '#C4956A'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(2, 2, 4, 0, Math.PI*2); ctx.fill()

      // Collar
      ctx.strokeStyle = p.side === 'left' ? '#5B3FDB' : '#C17A2A'
      ctx.lineWidth = 5
      ctx.beginPath(); ctx.arc(0, DOG_R*0.3, DOG_R*0.7, -2.3, -0.8); ctx.stroke()

      // Name tag
      ctx.fillStyle = 'rgba(20,10,50,0.85)'
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(-28, DOG_R + 8, 56, 18, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = p.side === 'left' ? '#C17A2A' : '#8B7FDB'
      ctx.font = "bold 8px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.name.slice(0, 6), 0, DOG_R + 17)

      ctx.restore()
    }

    function drawBall() {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath(); ctx.ellipse(ball.x+3, ball.y+BALL_R+2, BALL_R*0.9, 5, 0, 0, Math.PI*2); ctx.fill()
      ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.spin)
      ctx.fillStyle = '#F5EFE0'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(0, 0, BALL_R*0.28, 0, Math.PI*2); ctx.fill()
      for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2 - Math.PI/2
        ctx.beginPath(); ctx.arc(Math.cos(a)*BALL_R*0.62, Math.sin(a)*BALL_R*0.62, BALL_R*0.18, 0, Math.PI*2); ctx.fill()
      }
      ctx.restore()
    }

    function drawHUD() {
      // Score board
      ctx.fillStyle = 'rgba(10,5,30,0.9)'
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.roundRect(CW/2 - 100, 6, 200, 46, 10); ctx.fill(); ctx.stroke()

      // Player names
      ctx.font = "bold 9px 'Press Start 2P', monospace"
      ctx.fillStyle = '#C17A2A'; ctx.textAlign = 'left'
      ctx.fillText(p1.name.slice(0,6), CW/2 - 94, 22)
      ctx.fillStyle = '#8B7FDB'; ctx.textAlign = 'right'
      ctx.fillText(p2.name.slice(0,6), CW/2 + 94, 22)

      // Score
      ctx.fillStyle = '#F5EFE0'; ctx.font = "bold 22px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(`${scores[0]}  –  ${scores[1]}`, CW/2, 36)

      // Timer
      ctx.font = "7px 'Press Start 2P', monospace"
      ctx.fillStyle = timeLeft <= 15 ? '#FF6B6B' : '#A0C4FF'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, CW/2, 48)

      // Goal flash
      if (goalFlash > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, goalFlash * 0.6)
        ctx.fillStyle = goalFlashSide === 0 ? 'rgba(193,122,42,0.35)' : 'rgba(91,63,219,0.35)'
        ctx.fillRect(0, 0, CW, CH)
        ctx.globalAlpha = Math.min(1, goalFlash)
        ctx.fillStyle = '#F0B429'
        ctx.font = "bold 28px 'Press Start 2P', monospace"
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = '#000'; ctx.shadowBlur = 10
        ctx.fillText('⚽ GOAL! ⚽', CW/2, CH/2)
        ctx.shadowBlur = 0; ctx.restore()
      }
    }

    // ── Button layout ─────────────────────────────────────────────────────────
    function layoutButtons() {
      const bw = 72, bh = 72, gap = 8
      const by = CH - bh - 12
      // Left side: ← →
      BTN.left  = { x: 12,          y: by, w: bw, h: bh }
      BTN.right = { x: 12 + bw + gap, y: by, w: bw, h: bh }
      // Right side: ↑ A
      BTN.up = { x: CW - bw - 12,           y: by, w: bw, h: bh }
      BTN.a  = { x: CW - bw*2 - gap - 12,   y: by, w: bw, h: bh }
    }

    function drawButtons() {
      const btnStyle = (active, color) => {
        ctx.fillStyle = active ? color : 'rgba(30,20,70,0.85)'
        ctx.strokeStyle = active ? '#FFD700' : '#2D2D2D'
        ctx.lineWidth = 3
      }

      for (const [key, label, color] of [
        ['left',  '←', '#C17A2A'],
        ['right', '→', '#C17A2A'],
        ['up',    '↑', '#5B3FDB'],
        ['a',     'A', '#E05050'],
      ]) {
        const b = BTN[key]
        if (!b) continue
        ctx.save()
        btnStyle(keys[key], color)
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke()
        ctx.fillStyle = keys[key] ? '#FFD700' : '#F5EFE0'
        ctx.font = "bold 22px 'Press Start 2P', monospace"
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(label, b.x + b.w/2, b.y + b.h/2)
        ctx.restore()
      }
    }

    layoutButtons()

    // ── Game loop ─────────────────────────────────────────────────────────────
    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) { draw(); return }

      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      timeLeft -= delta
      goalFlash = Math.max(0, goalFlash - delta * 1.4)

      // Apply input to p1
      if (keys.left)  p1.vx = -MOVE_SPD
      if (keys.right) p1.vx =  MOVE_SPD
      if (!keys.left && !keys.right) p1.vx *= 0.7
      if (keys.up && p1.onGround) { p1.vy = JUMP_V; p1.onGround = false }
      if (keys.a) { p1.power = true; p1.powerTimer = 0.15 }

      updateAI(delta)
      updatePlayer(p1, delta)
      updatePlayer(p2, delta)
      updateBall()

      if (timeLeft <= 0) {
        timeLeft = 0; gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        window.ANAGO_UI?.showResult(winner, [...scores])
      }

      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH)
      drawBackground()
      drawGoals()
      drawDog(p1)
      drawDog(p2)
      drawBall()
      drawHUD()
      drawButtons()
    }

    animId = requestAnimationFrame(loop)

    const onResize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      layoutButtons()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('resize',  onResize)
    }
  }, [config])

  return <canvas ref={ref} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
